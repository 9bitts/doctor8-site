// src/app/api/patient/history/share/route.ts
// Generates a secure temporary share link for medical history
// Patient can send this link to any doctor, even outside the platform

import { NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { nanoid } from "nanoid";

export async function POST() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId, patientProfileId } = ctx;

  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const shared = await db.sharedRecord.create({
    data: {
      documentId: (await db.medicalDocument.findFirst({
        where: { patientId: patientProfileId },
      }))?.id || (
        await db.medicalDocument.create({
          data: {
            patientId: patientProfileId,
            type: "CLINICAL_NOTE",
            title: "Medical History",
            content: "Patient medical history export",
          },
        })
      ).id,
      patientId: patientProfileId,
      accessToken: token,
      expiresAt,
    },
  });

  await audit.shareRecord(userId, shared.id, { method: "link", expires: expiresAt });

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/share/${token}`;
  return NextResponse.json({ url, expiresAt });
}
