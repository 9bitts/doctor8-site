// src/app/api/patient/share/route.ts
// Creates a shareable record (history or medications) with 3 options:
// 1. Public link (with expiry)
// 2. Direct share to a Doctor8 professional (message + notification)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { storedNotificationText } from "@/lib/notification-i18n";
import { decrypt } from "@/lib/encryption";
import { z } from "zod";
import { nanoid } from "nanoid";

const schema = z.object({
  type: z.enum(["history", "medications"]),
  // Optional: share directly with a professional inside Doctor8
  professionalUserId: z.string().optional(),
  // Expiry in hours (0 = never)
  expiresInHours: z.number().min(0).default(72),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { type, professionalUserId, expiresInHours } = parsed.data;

  const patient = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  // Generate unique access token
  const accessToken = nanoid(32);
  const expiresAt = expiresInHours > 0
    ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
    : null;

  // Build the content to share based on type
  let content: Record<string, unknown> = {};

  if (type === "history") {
    const profile = await db.patientProfile.findUnique({ where: { id: patient.id } });
    if (profile?.notes) {
      try { content = JSON.parse(decrypt(profile.notes)); } catch { content = {}; }
    }
    if (profile?.bloodType) content.bloodType = profile.bloodType;
    if (profile?.allergies) content.allergies = decrypt(profile.allergies);
  } else {
    const meds = await db.medication.findMany({
      where: { patientId: patient.id, active: true, flow: "CLINICAL" },
      orderBy: { createdAt: "desc" },
    });
    content.medications = meds.map((m) => ({
      name: decrypt(m.name),
      dosage: m.dosage ? decrypt(m.dosage) : null,
      frequency: m.frequency ? decrypt(m.frequency) : null,
      prescribedBy: m.prescribedBy,
      notes: m.notes ? decrypt(m.notes) : null,
    }));
  }

  // Find or create a MedicalDocument to attach the SharedRecord to
  const doc = await db.medicalDocument.create({
    data: {
      patientId: patient.id,
      type: type === "history" ? "CLINICAL_NOTE" : "OTHER",
      title: type === "history" ? "Medical History (shared)" : "Medications (shared)",
      content: JSON.stringify(content),
    },
  });

  // Create the SharedRecord
  const shared = await db.sharedRecord.create({
    data: {
      documentId: doc.id,
      patientId: patient.id,
      accessToken,
      expiresAt,
      ...(professionalUserId ? { sharedWithUserId: professionalUserId } : {}),
    },
  });

  // If sharing directly with a Doctor8 professional, send a message + notification
  if (professionalUserId) {
    const professional = await db.professionalProfile.findUnique({
      where: { userId: professionalUserId },
      select: { firstName: true, lastName: true },
    });

    const patientName = `${patient.firstName} ${patient.lastName}`;
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://doctor8.app";
    const shareUrl = `${APP_URL}/share/${accessToken}`;

    const label = type === "history" ? "medical history" : "medication list";
    const messageContent = `📋 ${patientName} shared their ${label} with you.\n\nView here: ${shareUrl}`;

    // Create message from patient's user to professional's user
    await db.message.create({
      data: {
        senderId: session.user.id,
        receiverId: professionalUserId,
        content: messageContent,
      },
    });

    const titleKey =
      type === "history" ? "notif.patientShare.titleHistory" : "notif.patientShare.titleMeds";
    const bodyKey =
      type === "history" ? "notif.patientShare.bodyHistory" : "notif.patientShare.bodyMeds";
    const shareCopy = storedNotificationText(titleKey, bodyKey, { name: patientName });

    // Create notification for the professional
    await db.notification.create({
      data: {
        userId: professionalUserId,
        title: shareCopy.title,
        body: shareCopy.body,
        type: "shared_record",
        data: {
          shareUrl,
          patientName,
          type,
          titleKey: type === "history" ? "notif.patientShare.titleHistory" : "notif.patientShare.titleMeds",
          bodyKey: type === "history" ? "notif.patientShare.bodyHistory" : "notif.patientShare.bodyMeds",
          bodyParams: { name: patientName },
        },
      },
    });
  }

  await audit.createRecord(session.user.id, "SharedRecord", shared.id);

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://doctor8.app";
  return NextResponse.json({
    success: true,
    shareUrl: `${APP_URL}/share/${accessToken}`,
    accessToken,
    expiresAt: expiresAt?.toISOString() || null,
  }, { status: 201 });
}

// GET - list existing shares for the patient
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const patient = await db.patientProfile.findUnique({ where: { userId: session.user.id } });
  if (!patient) return NextResponse.json({ shares: [] });

  const shares = await db.sharedRecord.findMany({
    where: { patientId: patient.id },
    include: { document: { select: { title: true, type: true, createdAt: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ shares });
}
