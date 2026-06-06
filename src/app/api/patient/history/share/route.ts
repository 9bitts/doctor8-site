// src/app/api/patient/history/share/route.ts
// Generates a secure temporary share link for medical history
// Patient can send this link to any doctor, even outside the platform

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { nanoid } from "nanoid";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const patient = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Create a first medical document record to share if none exists
  // In practice, create a virtual "history" document
  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Store the share token
  const shared = await db.sharedRecord.create({
    data: {
      documentId: (await db.medicalDocument.findFirst({
        where: { patientId: patient.id },
      }))?.id || (
        await db.medicalDocument.create({
          data: {
            patientId: patient.id,
            type: "CLINICAL_NOTE",
            title: "Medical History",
            content: "Patient medical history export",
          },
        })
      ).id,
      patientId: patient.id,
      accessToken: token,
      expiresAt,
    },
  });

  await audit.shareRecord(session.user.id, shared.id, { method: "link", expires: expiresAt });

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/share/${token}`;
  return NextResponse.json({ url, expiresAt });
}
