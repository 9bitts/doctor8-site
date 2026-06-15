// src/app/api/professional/records/[id]/route.ts
// PATCH — update a chart's email (only allowed when the chart has NO linked account).
// On success, tries to re-link: if an account already exists with the new email,
// links it and attaches the chart's documents to that patient's profile.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  email: z.string().email().or(z.literal("")),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PROFESSIONAL") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!professional) {
    return NextResponse.json({ error: "No profile" }, { status: 404 });
  }

  const record = await db.patientRecord.findFirst({
    where: { id: params.id, professionalId: professional.id },
  });
  if (!record) {
    return NextResponse.json({ error: "Chart not found" }, { status: 404 });
  }

  // Safety: do not allow changing the email of a chart already linked to an account.
  if (record.linkedUserId) {
    return NextResponse.json(
      { error: "This chart is already linked to an account; its email can't be changed." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const newEmail = parsed.data.email ? parsed.data.email.toLowerCase() : null;

  // Try to re-link to an existing account with the new email.
  let linkedUserId: string | null = null;
  if (newEmail) {
    const existing = await db.user.findUnique({ where: { email: newEmail } });
    if (existing && existing.role === "PATIENT") linkedUserId = existing.id;
  }

  await db.patientRecord.update({
    where: { id: record.id },
    data: {
      email: newEmail,
      ...(linkedUserId ? { linkedUserId } : {}),
    },
  });

  // If we linked to an existing account, attach this chart's documents to the
  // patient's profile so they show up for the patient (same as the signup flow).
  if (linkedUserId) {
    try {
      const profile = await db.patientProfile.findUnique({
        where: { userId: linkedUserId },
        select: { id: true },
      });
      if (profile) {
        await db.medicalDocument.updateMany({
          where: { patientRecordId: record.id, patientId: null },
          data: { patientId: profile.id },
        });
      }
    } catch (e) {
      console.error("[RECORD PATCH] attach docs failed:", e);
    }
  }

  return NextResponse.json({
    success: true,
    email: newEmail,
    hasAccount: !!linkedUserId,
  });
}
