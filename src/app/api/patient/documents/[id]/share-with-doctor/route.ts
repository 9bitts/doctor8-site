// src/app/api/patient/documents/[id]/share-with-doctor/route.ts
// POST   — patient shares one of their OWN documents with an eligible doctor.
// DELETE  — patient un-shares it (removes access + tells the doctor).
//
// Eligibility (POST, checked server-side): the patient must have a CONFIRMED
// or COMPLETED appointment with that professional.
import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import { PATIENT_DOCTOR_ELIGIBLE_STATUSES } from "@/lib/patient-doctor-eligibility";
import { z } from "zod";

const schema = z.object({
  professionalId: z.string(), // ProfessionalProfile.id
});

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId, patientProfileId } = ctx;

  const patient = await db.patientProfile.findUnique({
    where: { userId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!patient) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { professionalId } = parsed.data;

  const doc = await db.medicalDocument.findUnique({
    where: { id: params.id },
    select: { id: true, patientId: true, title: true },
  });
  if (!doc || doc.patientId !== patientProfileId) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const professional = await db.professionalProfile.findUnique({
    where: { id: professionalId },
    select: { id: true, userId: true },
  });
  if (!professional) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

  const eligible = await db.appointment.findFirst({
    where: {
      patientId: patientProfileId,
      professionalId: professional.id,
      status: { in: [...PATIENT_DOCTOR_ELIGIBLE_STATUSES] },
    },
    select: { id: true },
  });
  if (!eligible) {
    return NextResponse.json(
      { error: "You can only share with a doctor you have a confirmed appointment with." },
      { status: 403 }
    );
  }

  const already = await db.sharedRecord.findFirst({
    where: {
      documentId: doc.id,
      sharedWithProfessionalId: professional.id,
      sharedByUserId: userId,
    },
    select: { id: true },
  });
  if (already) {
    return NextResponse.json({ shared: true, alreadyShared: true });
  }

  await db.sharedRecord.create({
    data: {
      documentId: doc.id,
      patientId: patientProfileId,
      sharedWithUserId: professional.userId,
      sharedByUserId: userId,
      sharedWithProfessionalId: professional.id,
    },
  });

  const docTitle = safeDecrypt(doc.title);
  const patientName = `${patient.firstName} ${patient.lastName}`.trim() || "A patient";

  await db.message.create({
    data: {
      senderId: userId,
      receiverId: professional.userId,
      content: encrypt(`📎 Shared a document with you: ${docTitle}`),
    },
  });

  const shareCopy = storedNotificationText("notif.docShared.title", "notif.docShared.body", {
    name: patientName,
    title: docTitle,
  });
  await createNotification({
    userId: professional.userId,
    title: shareCopy.title,
    body: shareCopy.body,
    type: "shared_record",
    data: {
      fromUserId: userId,
      documentId: doc.id,
      kind: "patient_shared_document",
      titleKey: "notif.docShared.title",
      bodyKey: "notif.docShared.body",
      bodyParams: { name: patientName, title: docTitle },
    },
  });

  return NextResponse.json({ shared: true });
}

// DELETE ?professionalId=...  — un-share a document from a doctor.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId, patientProfileId } = ctx;

  const patient = await db.patientProfile.findUnique({
    where: { userId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!patient) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const professionalId = searchParams.get("professionalId");
  if (!professionalId) return NextResponse.json({ error: "Missing professionalId" }, { status: 400 });

  const doc = await db.medicalDocument.findUnique({
    where: { id: params.id },
    select: { id: true, patientId: true, title: true },
  });
  if (!doc || doc.patientId !== patientProfileId) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const professional = await db.professionalProfile.findUnique({
    where: { id: professionalId },
    select: { id: true, userId: true },
  });
  if (!professional) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

  // Remove all shares of this doc with this professional from this patient.
  const del = await db.sharedRecord.deleteMany({
    where: {
      documentId: doc.id,
      sharedWithProfessionalId: professional.id,
      patientId: patientProfileId,
    },
  });

  if (del.count > 0) {
    const docTitle = safeDecrypt(doc.title);
    const patientName = `${patient.firstName} ${patient.lastName}`.trim() || "A patient";

    // Tell the doctor it was un-shared.
    await db.message.create({
      data: {
        senderId: userId,
        receiverId: professional.userId,
        content: encrypt(`📌 Unshared a document: ${docTitle}`),
      },
    });
    const unshareCopy = storedNotificationText("notif.docUnshared.title", "notif.docUnshared.body", {
      name: patientName,
      title: docTitle,
    });
    await createNotification({
      userId: professional.userId,
      title: unshareCopy.title,
      body: unshareCopy.body,
      type: "shared_record",
      data: {
        fromUserId: userId,
        documentId: doc.id,
        kind: "patient_unshared_document",
        titleKey: "notif.docUnshared.title",
        bodyKey: "notif.docUnshared.body",
        bodyParams: { name: patientName, title: docTitle },
      },
    });
  }

  return NextResponse.json({ unshared: true });
}
