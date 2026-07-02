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
import { audit, createAuditLog } from "@/lib/audit";
import { encrypt, decrypt } from "@/lib/encryption";
import { z } from "zod";
import { AuditAction } from "@prisma/client";
import { createNotification } from "@/lib/notifications";
import { hasAcceptedLink } from "@/lib/patient-professional-link";

const medicationItemSchema = z.object({
  name: z.string().min(1),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  instructions: z.string().optional(),
  itemKind: z.enum(["medication", "device", "phytotherapy"]).optional(),
}).superRefine((item, ctx) => {
  const kind = item.itemKind || "medication";
  if (kind === "medication") {
    if (!item.dosage?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "dosage required", path: ["dosage"] });
    if (!item.frequency?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "frequency required", path: ["frequency"] });
  }
});

const prescriptionSchema = z.object({
  // Either one of these identifies the patient. patientRecordId is preferred (new flow).
  patientRecordId: z.string().optional(),
  patientUserId: z.string().optional(),
  appointmentId: z.string().optional(),
  medications: z.array(medicationItemSchema).min(1),
  instructions: z.string().optional(),
  validDays: z.number().min(1).max(365).default(30),
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

  const { patientRecordId, patientUserId, appointmentId, medications, instructions, validDays } = parsed.data;

  const professional = await db.professionalProfile.findUnique({ where: { userId: ctx.userId } });
  if (!professional) {
    return NextResponse.json({ error: "Professional not found" }, { status: 404 });
  }

  const validUntil = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000);

  // Resolve the patient target: prefer the chart (PatientRecord), fall back to account.
  let documentPatientId: string | null = null;
  let documentPatientRecordId: string | null = null;

  if (patientRecordId) {
    const record = await db.patientRecord.findFirst({
      where: { id: patientRecordId, professionalId: ctx.professional.id },
    });
    if (!record) {
      return NextResponse.json({ error: "Patient chart not found" }, { status: 404 });
    }
    documentPatientRecordId = record.id;

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
  }

  if (appointmentId) {
    const appt = await db.appointment.findFirst({
      where: {
        id: appointmentId,
        professionalId: ctx.professional.id,
        ...(documentPatientId ? { patientId: documentPatientId } : {}),
      },
      select: { id: true },
    });
    if (!appt) {
      return NextResponse.json(
        { error: "Appointment does not belong to this professional and patient" },
        { status: 400 },
      );
    }
  }

  let emitWithoutLink = false;
  if (patientUserId && !patientRecordId) {
    const linked = await hasAcceptedLink(patientUserId, ctx.userId);
    const hasAppointment = documentPatientId
      ? await db.appointment.findFirst({
          where: { professionalId: ctx.professional.id, patientId: documentPatientId },
          select: { id: true },
        })
      : null;
    emitWithoutLink = !linked && !hasAppointment;
  }

  // Create medical document entry (holds the link to patient and/or chart)
  const document = await db.medicalDocument.create({
    data: {
      patientId: documentPatientId,
      patientRecordId: documentPatientRecordId,
      professionalId: ctx.professional.id,
      appointmentId: appointmentId || null,
      type: "PRESCRIPTION",
      title: encrypt(`Prescription — ${new Date().toLocaleDateString("en-US")}`),
    },
  });

  // Create prescription
  const prescription = await db.prescription.create({
    data: {
      documentId: document.id,
      professionalId: ctx.professional.id,
      medications: medications as any,
      instructions: instructions ? encrypt(instructions) : null,
      validUntil,
    },
  });

  await audit.createRecord(ctx.userId, "Prescription", prescription.id);

  if (emitWithoutLink && patientUserId) {
    console.log(
      "[PHI-EMIT-AUDIT]",
      JSON.stringify({
        professionalUserId: ctx.userId,
        patientUserId,
        prescriptionId: prescription.id,
        at: new Date().toISOString(),
      }),
    );
    await createAuditLog({
      userId: ctx.userId,
      action: AuditAction.CREATE_RECORD,
      resource: "PrescriptionEmitWithoutLink",
      resourceId: prescription.id,
      details: { patientUserId },
    });

    const proFull = await db.professionalProfile.findUnique({
      where: { id: ctx.professional.id },
      select: { firstName: true, lastName: true, licenseNumber: true },
    });
    const drName = proFull
      ? `Dr. ${proFull.firstName} ${proFull.lastName}`.trim()
      : "Doctor";

    await createNotification({
      userId: patientUserId,
      title: "New prescription",
      body: `${drName} sent you a prescription. Review it and accept a connection if you know this provider.`,
      type: "system",
      data: {
        url: "/patient/prescriptions",
        prescriptionId: prescription.id,
        professionalUserId: ctx.userId,
        canReport: true,
      },
    });
  }

  return NextResponse.json(
    { success: true, prescriptionId: prescription.id, documentId: document.id },
    { status: 201 }
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
      whatsappNotifyStatus: (p as { whatsappNotifyStatus?: string | null }).whatsappNotifyStatus ?? null,
      digitalSignature: p.digitalSignature,
      signed: (p as { signatureStatus?: string | null }).signatureStatus === "SIGNED",
      document: {
        patient: firstName || lastName ? { firstName, lastName } : null,
      },
    };
  });

  return NextResponse.json({ prescriptions: decoded });
}
