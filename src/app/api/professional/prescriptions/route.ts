// src/app/api/professional/prescriptions/route.ts
//
// ETAPA 2: the prescription can now be issued for a PatientRecord (a chart),
// with OR without a real patient account.
//
// Backward compatible:
//   - Old flow: { patientUserId, medications, ... }  → still works (links to PatientProfile)
//   - New flow: { patientRecordId, medications, ... } → links the prescription's
//                MedicalDocument to the chart via patientRecordId (no account required)
//
// The MedicalDocument already supports both patientId and patientRecordId in the schema,
// so no schema change is needed.

import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { z } from "zod";
import { prescriptionMedicationItemSchema } from "@/lib/prescription-medication-schema";
import { createPrescriptionBatch } from "@/lib/create-prescriptions";

const medicationItemSchema = prescriptionMedicationItemSchema;

const prescriptionSchema = z.object({
  // Either one of these identifies the patient. patientRecordId is preferred (new flow).
  patientRecordId: z.string().optional(),
  patientUserId: z.string().optional(),
  appointmentId: z.string().optional(),
  medications: z.array(medicationItemSchema).min(1),
  instructions: z.string().optional(),
  validDays: z.number().min(1).max(365).default(30),
  cannabisTcleAccepted: z.boolean().optional(),
  issuedViaTelemedicine: z.boolean().optional(),
}).refine(
  (d) => !!d.patientRecordId || !!d.patientUserId,
  { message: "patientRecordId or patientUserId is required" }
);

function safeDecrypt(v: string): string {
  try { return decrypt(v); } catch { return v; }
}

export async function POST(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json();
  const parsed = prescriptionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { patientRecordId, patientUserId, appointmentId, medications, instructions, validDays, cannabisTcleAccepted, issuedViaTelemedicine } = parsed.data;

  const professional = await db.professionalProfile.findUnique({ where: { userId: ctx.userId } });
  if (!professional) {
    return NextResponse.json({ error: "Professional not found" }, { status: 404 });
  }

  const batch = await createPrescriptionBatch({
    professionalId: professional.id,
    professionalUserId: ctx.userId,
    patientRecordId,
    patientUserId,
    appointmentId,
    medications,
    instructions,
    validDays,
    cannabisTcleAccepted,
    issuedViaTelemedicine,
    lang: "pt",
  });

  if (!batch.ok) {
    const status = batch.needsSncrAuth ? 428 : 400;
    return NextResponse.json(
      {
        error: batch.error,
        needsSncrAuth: batch.needsSncrAuth || false,
        needsSncrPlatform: batch.needsSncrPlatform || false,
        sncrLoginPath:
          batch.needsSncrAuth && !batch.needsSncrPlatform
            ? "/api/professional/sncr/auth/login"
            : undefined,
      },
      { status },
    );
  }

  const primary = batch.prescriptions[0];
  return NextResponse.json(
    {
      success: true,
      prescriptionId: primary.id,
      documentId: primary.documentId,
      packageId: batch.packageId,
      isMixed: batch.isMixed,
      prescriptions: batch.prescriptions.map((p) => ({
        id: p.id,
        documentId: p.documentId,
        formKind: p.formKind,
        label: p.label,
        sncrReceiptNumber: p.sncrReceiptNumber,
        medications: p.medications,
      })),
    },
    { status: 201 },
  );
}

export async function GET(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const professional = await db.professionalProfile.findUnique({ where: { userId: ctx.userId } });
  if (!professional) return NextResponse.json({ prescriptions: [] });

  const prescriptions = await db.prescription.findMany({
    where: { professionalId: ctx.professional.id },
    include: {
      document: {
        include: {
          patient: { select: { firstName: true, lastName: true } },
          patientRecord: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Patient names are encrypted both on PatientProfile and on PatientRecord.
  // Decrypt here and expose a single, consistent patient name for the UI.
  const decoded = prescriptions.map((p) => {
    const fromRecord = p.document?.patientRecord;
    const fromProfile = p.document?.patient;
    let firstName = "";
    let lastName = "";
    if (fromRecord) {
      firstName = safeDecrypt(fromRecord.firstName);
      lastName = safeDecrypt(fromRecord.lastName);
    } else if (fromProfile) {
      firstName = safeDecrypt(fromProfile.firstName);
      lastName = safeDecrypt(fromProfile.lastName);
    }
    return {
      id: p.id,
      createdAt: p.createdAt,
      validUntil: p.validUntil,
      medications: p.medications,
      instructions: p.instructions ? safeDecrypt(p.instructions) : "",
      patientRecordId: p.document?.patientRecordId ?? null,
      signatureStatus: (p as { signatureStatus?: string | null }).signatureStatus ?? null,
      prescriptionFormKind: (p as { prescriptionFormKind?: string | null }).prescriptionFormKind ?? null,
      sncrReceiptNumber: (p as { sncrReceiptNumber?: string | null }).sncrReceiptNumber ?? null,
      prescriptionPackageId: (p as { prescriptionPackageId?: string | null }).prescriptionPackageId ?? null,
      whatsappNotifyStatus: (p as { whatsappNotifyStatus?: string | null }).whatsappNotifyStatus ?? null,
      patientNotifiedAt: !!(p as { patientNotifiedAt?: Date | null }).patientNotifiedAt,
      digitalSignature: p.digitalSignature,
      signed: (p as { signatureStatus?: string | null }).signatureStatus === "SIGNED",
      document: {
        patient: firstName || lastName ? { firstName, lastName } : null,
      },
    };
  });

  return NextResponse.json({ prescriptions: decoded });
}
