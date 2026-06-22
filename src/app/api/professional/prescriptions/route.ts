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
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { encrypt, decrypt } from "@/lib/encryption";
import { createNotification } from "@/lib/notifications";
import { sendPrescriptionNotification } from "@/lib/email-prescription";
import { z } from "zod";

const medicationItemSchema = z.object({
  name: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  duration: z.string().optional(),
  instructions: z.string().optional(),
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
  const session = await auth();
  if (!session?.user || session.user.role !== "PROFESSIONAL") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = prescriptionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { patientRecordId, patientUserId, appointmentId, medications, instructions, validDays } = parsed.data;

  const professional = await db.professionalProfile.findUnique({ where: { userId: session.user.id } });
  if (!professional) {
    return NextResponse.json({ error: "Professional not found" }, { status: 404 });
  }

  const validUntil = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000);

  // Resolve the patient target: prefer the chart (PatientRecord), fall back to account.
  let documentPatientId: string | null = null;   // PatientProfile.id (old flow)
  let documentPatientRecordId: string | null = null; // PatientRecord.id (new flow)
  let notifyUserId: string | null = null;         // patient account to notify (if any)
  let notifyEmail: string | null = null;          // patient email to notify (if any)
  let notifyName = "";                             // patient first name for the email

  if (patientRecordId) {
    // New flow: prescribe for a chart (with or without account)
    const record = await db.patientRecord.findFirst({
      where: { id: patientRecordId, professionalId: professional.id },
    });
    if (!record) {
      return NextResponse.json({ error: "Patient chart not found" }, { status: 404 });
    }
    documentPatientRecordId = record.id;

    // If this chart is linked to a real account, also attach the PatientProfile
    // so the prescription shows up for the patient inside the app.
    if (record.linkedUserId) {
      const profile = await db.patientProfile.findUnique({ where: { userId: record.linkedUserId } });
      if (profile) documentPatientId = profile.id;
      notifyUserId = record.linkedUserId;
      notifyEmail = record.email || null;
      try { notifyName = decrypt(record.firstName); } catch { notifyName = record.firstName; }
    }
  } else if (patientUserId) {
    // Old flow: prescribe for an existing account
    const patient = await db.patientProfile.findUnique({ where: { userId: patientUserId } });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    documentPatientId = patient.id;
    notifyUserId = patientUserId;
    try {
      const u = await db.user.findUnique({ where: { id: patientUserId }, select: { email: true } });
      notifyEmail = u?.email || null;
      notifyName = decrypt(patient.firstName);
    } catch { notifyName = ""; }
  }

  // Create medical document entry (holds the link to patient and/or chart)
  const document = await db.medicalDocument.create({
    data: {
      patientId: documentPatientId,
      patientRecordId: documentPatientRecordId,
      professionalId: professional.id,
      appointmentId: appointmentId || null,
      type: "PRESCRIPTION",
      title: encrypt(`Prescription — ${new Date().toLocaleDateString("en-US")}`),
    },
  });

  // Create prescription
  const prescription = await db.prescription.create({
    data: {
      documentId: document.id,
      professionalId: professional.id,
      medications: medications as any,
      instructions: instructions ? encrypt(instructions) : null,
      validUntil,
      digitalSignature: `${professional.id}-${Date.now()}`,
    },
  });

  await audit.createRecord(session.user.id, "Prescription", prescription.id);

  // Notify the patient — ONLY if they already have an account (linked user).
  // Never let notification/email failures break the prescription creation.
  if (notifyUserId) {
    const doctorName = `${professional.firstName} ${professional.lastName}`.trim();

    // In-app bell notification
    try {
      await createNotification({
        userId: notifyUserId,
        title: "Nova receita / New prescription",
        body: `Dr. ${doctorName}`,
        type: "system",
        data: { prescriptionId: prescription.id, documentId: document.id },
      });
    } catch (e) {
      console.error("[PRESCRIPTION] notification failed:", e);
    }

    // Email notice (no clinical data in the email)
    if (notifyEmail) {
      try {
        const u = await db.user.findUnique({
          where: { id: notifyUserId },
          select: { language: true },
        });
        await sendPrescriptionNotification({
          patientEmail: notifyEmail,
          patientName: notifyName || "—",
          doctorName,
          language: u?.language,
        });
      } catch (e) {
        console.error("[PRESCRIPTION] email failed:", e);
      }
    }
  }

  return NextResponse.json(
    { success: true, prescriptionId: prescription.id, documentId: document.id },
    { status: 201 }
  );
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PROFESSIONAL") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const professional = await db.professionalProfile.findUnique({ where: { userId: session.user.id } });
  if (!professional) return NextResponse.json({ prescriptions: [] });

  const prescriptions = await db.prescription.findMany({
    where: { professionalId: professional.id },
    include: {
      document: {
        include: {
          patient: { select: { firstName: true, lastName: true } },
          patientRecord: { select: { firstName: true, lastName: true } },
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
      document: {
        patient: firstName || lastName ? { firstName, lastName } : null,
      },
    };
  });

  return NextResponse.json({ prescriptions: decoded });
}
