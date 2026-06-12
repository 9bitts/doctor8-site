// src/app/api/patient/documents/[id]/share-with-doctor/route.ts
// POST — patient shares one of their OWN documents with an eligible doctor.
//
// Eligibility (checked server-side, never trust the client):
//   the patient must have a CONFIRMED appointment with that professional.
//
// Effects:
//   - create a SharedRecord (patient -> doctor) with direction fields
//   - create a Message in the patient<->doctor conversation ("shared a document")
//     so it shows up in Messages as unread AND lights the bell
//   - create a bell notification for the doctor
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const schema = z.object({
  professionalId: z.string(), // ProfessionalProfile.id chosen by the patient
});

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const patient = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!patient) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { professionalId } = parsed.data;

  // 1) The document must belong to this patient (their own document).
  const doc = await db.medicalDocument.findUnique({
    where: { id: params.id },
    select: { id: true, patientId: true, title: true },
  });
  if (!doc || doc.patientId !== patient.id) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // 2) The chosen professional must be eligible (CONFIRMED appointment).
  const professional = await db.professionalProfile.findUnique({
    where: { id: professionalId },
    select: { id: true, userId: true, firstName: true, lastName: true },
  });
  if (!professional) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

  const eligible = await db.appointment.findFirst({
    where: { patientId: patient.id, professionalId: professional.id, status: "CONFIRMED" },
    select: { id: true },
  });
  if (!eligible) {
    return NextResponse.json(
      { error: "You can only share with a doctor you have a confirmed appointment with." },
      { status: 403 }
    );
  }

  // 3) Idempotency: don't create a duplicate active share.
  const already = await db.sharedRecord.findFirst({
    where: {
      documentId: doc.id,
      sharedWithProfessionalId: professional.id,
      sharedByUserId: session.user.id,
    },
    select: { id: true },
  });
  if (already) {
    return NextResponse.json({ shared: true, alreadyShared: true });
  }

  // 4) Create the share (patient -> doctor).
  await db.sharedRecord.create({
    data: {
      documentId: doc.id,
      patientId: patient.id,
      sharedWithUserId: professional.userId,
      sharedByUserId: session.user.id,
      sharedWithProfessionalId: professional.id,
    },
  });

  const docTitle = safeDecrypt(doc.title);
  const patientName = `${patient.firstName} ${patient.lastName}`.trim() || "A patient";

  // 5) Create a message in the conversation (shows in Messages as unread).
  await db.message.create({
    data: {
      senderId: session.user.id,
      receiverId: professional.userId,
      content: encrypt(`📎 Shared a document with you: ${docTitle}`),
    },
  });

  // 6) Bell notification for the doctor.
  await createNotification({
    userId: professional.userId,
    title: "Document shared",
    body: `${patientName} shared a document with you: ${docTitle}`,
    type: "shared_record",
    data: { fromUserId: session.user.id, documentId: doc.id, kind: "patient_shared_document" },
  });

  return NextResponse.json({ shared: true });
}
