import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuditAction } from "@prisma/client";
import { db } from "@/lib/db";
import { audit, createAuditLog } from "@/lib/audit";
import { encrypt, decrypt } from "@/lib/encryption";
import { createNotification } from "@/lib/notifications";
import { requireIntegrativeTherapist } from "@/lib/integrative-therapist-api";

import { integrativeMedicationItemSchema } from "@/lib/prescription-medication-schema";

const medicationItemSchema = integrativeMedicationItemSchema();

const prescriptionSchema = z.object({
  integrativeClientRecordId: z.string().optional(),
  patientUserId: z.string().optional(),
  appointmentId: z.string().optional(),
  medications: z.array(medicationItemSchema).min(1),
  instructions: z.string().optional(),
  validDays: z.number().min(1).max(365).default(30),
}).refine(
  (d) => !!d.integrativeClientRecordId || !!d.patientUserId,
  { message: "integrativeClientRecordId or patientUserId is required" },
);

function safeDecrypt(v: string): string {
  try { return decrypt(v); } catch { return v; }
}

export async function POST(req: NextRequest) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist, session } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const body = await req.json();
  const parsed = prescriptionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { integrativeClientRecordId, patientUserId, appointmentId, medications, instructions, validDays } = parsed.data;
  const validUntil = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000);

  let documentPatientId: string | null = null;
  let documentIntegrativeClientRecordId: string | null = null;

  if (integrativeClientRecordId) {
    const record = await db.integrativeClientRecord.findFirst({
      where: { id: integrativeClientRecordId, integrativeTherapistId: therapist.id },
    });
    if (!record) {
      return NextResponse.json({ error: "Client chart not found" }, { status: 404 });
    }
    documentIntegrativeClientRecordId = record.id;
    if (record.linkedUserId) {
      const profile = await db.patientProfile.findUnique({ where: { userId: record.linkedUserId } });
      if (profile) documentPatientId = profile.id;
    }
  } else if (patientUserId) {
    const patientUser = await db.user.findUnique({
      where: { id: patientUserId },
      select: { role: true, deletedAt: true },
    });
    if (!patientUser || patientUser.role !== "PATIENT" || patientUser.deletedAt) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    const patient = await db.patientProfile.findUnique({ where: { userId: patientUserId } });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    documentPatientId = patient.id;

    const existingClient = await db.integrativeClientRecord.findFirst({
      where: { integrativeTherapistId: therapist.id, linkedUserId: patientUserId },
    });
    if (existingClient) {
      documentIntegrativeClientRecordId = existingClient.id;
    }
  }

  if (appointmentId) {
    const appt = await db.appointment.findFirst({
      where: {
        id: appointmentId,
        integrativeTherapistId: therapist.id,
        ...(documentPatientId ? { patientId: documentPatientId } : {}),
      },
      select: { id: true },
    });
    if (!appt) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 400 });
    }
  }

  const document = await db.medicalDocument.create({
    data: {
      patientId: documentPatientId,
      integrativeClientRecordId: documentIntegrativeClientRecordId,
      integrativeTherapistId: therapist.id,
      appointmentId: appointmentId || null,
      type: "PRESCRIPTION",
      title: encrypt(`Prescrição — ${new Date().toLocaleDateString("pt-BR")}`),
    },
  });

  const prescription = await db.prescription.create({
    data: {
      documentId: document.id,
      integrativeTherapistId: therapist.id,
      medications: medications as object[],
      instructions: instructions ? encrypt(instructions) : null,
      validUntil,
    },
  });

  await audit.createRecord(session.user.id, "Prescription", prescription.id);

  if (patientUserId && !integrativeClientRecordId) {
    const therapistName = `${therapist.firstName} ${therapist.lastName}`.trim();
    await createNotification({
      userId: patientUserId,
      title: "Nova prescrição",
      body: `${therapistName} enviou uma nova prescrição.`,
      type: "system",
      data: {
        url: "/patient/prescriptions",
        prescriptionId: prescription.id,
      },
    });
    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.CREATE_RECORD,
      resource: "PrescriptionEmitWithoutChart",
      resourceId: prescription.id,
      details: { patientUserId },
    });
  }

  return NextResponse.json(
    { success: true, prescriptionId: prescription.id, documentId: document.id },
    { status: 201 },
  );
}

export async function GET() {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const prescriptions = await db.prescription.findMany({
    where: { integrativeTherapistId: therapist.id },
    include: {
      document: {
        include: {
          patient: { select: { firstName: true, lastName: true } },
          integrativeClientRecord: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const decoded = prescriptions.map((p) => {
    const fromRecord = p.document?.integrativeClientRecord;
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
      patientRecordId: p.document?.integrativeClientRecord?.id ?? null,
      signatureStatus: p.signatureStatus ?? null,
      whatsappNotifyStatus: p.whatsappNotifyStatus ?? null,
      patientNotifiedAt: !!p.patientNotifiedAt,
      digitalSignature: p.digitalSignature,
      signed: p.signatureStatus === "SIGNED",
      document: {
        patient: firstName || lastName ? { firstName, lastName } : null,
      },
    };
  });

  return NextResponse.json({ prescriptions: decoded });
}
