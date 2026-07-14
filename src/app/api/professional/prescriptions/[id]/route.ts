import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prescriptionMedicationItemSchema } from "@/lib/prescription-medication-schema";
import { assertCannabisPrescriptionAllowed } from "@/lib/cannabis-prescription-gate";
import { medicationListHasCannabis } from "@/lib/integrative-medicine/integrative-prescription-utils";
import { cannabisTcleAuditLine } from "@/lib/cannabis-medicinal-tcle";
import { canEditChart, resolveChartAccess } from "@/lib/chart-access";

function safeDecrypt(v: string | null | undefined): string {
  if (v == null) return "";
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

const patchSchema = z.object({
  medications: z.array(prescriptionMedicationItemSchema).min(1),
  instructions: z.string().optional(),
  validDays: z.number().min(1).max(365).default(30),
  cannabisTcleAccepted: z.boolean().optional(),
});

/** GET — fetch one prescription for reuse / detail (not limited to recent list). */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const prescription = await db.prescription.findFirst({
    where: {
      id: params.id,
      professionalId: ctx.professional.id,
    },
    include: {
      document: {
        include: {
          patient: { select: { firstName: true, lastName: true } },
          patientRecord: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!prescription) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const fromRecord = prescription.document?.patientRecord;
  const fromProfile = prescription.document?.patient;
  let firstName = "";
  let lastName = "";
  if (fromRecord) {
    firstName = safeDecrypt(fromRecord.firstName);
    lastName = safeDecrypt(fromRecord.lastName);
  } else if (fromProfile) {
    firstName = safeDecrypt(fromProfile.firstName);
    lastName = safeDecrypt(fromProfile.lastName);
  }

  return NextResponse.json({
    prescription: {
      id: prescription.id,
      createdAt: prescription.createdAt,
      validUntil: prescription.validUntil,
      medications: prescription.medications,
      instructions: prescription.instructions ? safeDecrypt(prescription.instructions) : "",
      patientRecordId: prescription.document?.patientRecordId ?? null,
      signatureStatus: prescription.signatureStatus ?? null,
      whatsappNotifyStatus: prescription.whatsappNotifyStatus ?? null,
      patientNotifiedAt: !!prescription.patientNotifiedAt,
      digitalSignature: prescription.digitalSignature,
      signed: prescription.signatureStatus === "SIGNED",
      document: {
        patient: firstName || lastName ? { firstName, lastName } : null,
      },
    },
  });
}

/** PATCH — update an unsigned prescription before sign/deliver. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const prescription = await db.prescription.findFirst({
    where: {
      id: params.id,
      professionalId: ctx.professional.id,
    },
    include: {
      document: {
        select: {
          patientRecordId: true,
        },
      },
    },
  });

  if (!prescription) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (prescription.signatureStatus === "SIGNED") {
    return NextResponse.json({ error: "Signed prescriptions cannot be edited" }, { status: 403 });
  }

  const recordId = prescription.document?.patientRecordId;
  if (recordId) {
    const access = await resolveChartAccess(ctx.professional.id, recordId);
    if (!canEditChart(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { medications, instructions, validDays, cannabisTcleAccepted } = parsed.data;

  const professional = await db.professionalProfile.findUnique({ where: { userId: ctx.userId } });
  if (!professional) {
    return NextResponse.json({ error: "Professional not found" }, { status: 404 });
  }

  const cannabisGate = assertCannabisPrescriptionAllowed(professional.specialty, medications);
  if (!cannabisGate.ok) {
    return NextResponse.json({ error: cannabisGate.message }, { status: 403 });
  }

  if (medicationListHasCannabis(medications) && !cannabisTcleAccepted) {
    return NextResponse.json(
      { error: "Cannabis medicinal TCLE acceptance is required before prescribing." },
      { status: 400 },
    );
  }

  const resolvedInstructions = (() => {
    const base = instructions?.trim() || "";
    if (!medicationListHasCannabis(medications) || !cannabisTcleAccepted) return base;
    const audit = cannabisTcleAuditLine();
    return base ? `${base}\n\n${audit}` : audit;
  })();

  const validUntil = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000);

  await db.prescription.update({
    where: { id: prescription.id },
    data: {
      medications: medications as Prisma.InputJsonValue,
      instructions: resolvedInstructions ? encrypt(resolvedInstructions) : null,
      validUntil,
    },
  });

  return NextResponse.json({ success: true, prescriptionId: prescription.id });
}
