// src/app/api/professional/prescriptions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { encrypt } from "@/lib/encryption";
import { z } from "zod";

const medicationItemSchema = z.object({
  name: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  duration: z.string().optional(),
  instructions: z.string().optional(),
});

const prescriptionSchema = z.object({
  patientUserId: z.string(),
  appointmentId: z.string().optional(),
  medications: z.array(medicationItemSchema).min(1),
  instructions: z.string().optional(),
  validDays: z.number().min(1).max(365).default(30),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PROFESSIONAL") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = prescriptionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { patientUserId, appointmentId, medications, instructions, validDays } = parsed.data;

  const [professional, patient] = await Promise.all([
    db.professionalProfile.findUnique({ where: { userId: session.user.id } }),
    db.patientProfile.findUnique({ where: { userId: patientUserId } }),
  ]);

  if (!professional || !patient) {
    return NextResponse.json({ error: "Professional or patient not found" }, { status: 404 });
  }

  const validUntil = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000);

  // Create medical document entry
  const document = await db.medicalDocument.create({
    data: {
      patientId: patient.id,
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

  return NextResponse.json({ success: true, prescriptionId: prescription.id, documentId: document.id }, { status: 201 });
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
      document: { include: { patient: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ prescriptions });
}
