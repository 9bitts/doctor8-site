// src/app/api/professional/records/[id]/route.ts
// PATCH — update a chart.
//   - email: only allowed when the chart has NO linked account (re-links if an
//     account already exists with the new email, attaching documents).
//   - registration data (P1-b): dateOfBirth, sex, cpf, address fields. Allowed even
//     when linked (the doctor may complete missing data needed to issue a prescription).
//
// The request may carry only the email, only the registration data, or both.
// Each block is handled independently so existing behavior is preserved.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { z } from "zod";

const patchSchema = z.object({
  // email is optional now (registration-only updates won't send it)
  email: z.string().email().or(z.literal("")).optional(),
  // P1-b registration data (all optional)
  dateOfBirth: z.string().optional().or(z.literal("")),
  sex: z.string().max(10).optional().or(z.literal("")),
  cpf: z.string().max(30).optional().or(z.literal("")),
  addressLine1: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  state: z.string().max(100).optional().or(z.literal("")),
  country: z.string().max(60).optional().or(z.literal("")),
  zipCode: z.string().max(30).optional().or(z.literal("")),
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

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
  const d = parsed.data;

  // Determine which blocks the request is trying to update.
  const wantsEmailChange = Object.prototype.hasOwnProperty.call(body, "email");
  const regKeys = ["dateOfBirth", "sex", "cpf", "addressLine1", "city", "state", "country", "zipCode"];
  const wantsRegUpdate = regKeys.some((k) => Object.prototype.hasOwnProperty.call(body, k));

  // ── Build the update payload ──
  const data: Record<string, unknown> = {};
  let linkedUserId: string | null = null;

  // EMAIL block (keeps the original safety rule: only when not linked)
  if (wantsEmailChange) {
    if (record.linkedUserId) {
      return NextResponse.json(
        { error: "This chart is already linked to an account; its email can't be changed." },
        { status: 400 }
      );
    }
    const newEmail = d.email ? d.email.toLowerCase() : null;
    data.email = newEmail;
    if (newEmail) {
      const existing = await db.user.findUnique({ where: { email: newEmail } });
      if (existing && existing.role === "PATIENT") {
        linkedUserId = existing.id;
        data.linkedUserId = linkedUserId;
      }
    }
  }

  // REGISTRATION block (allowed regardless of link status)
  if (wantsRegUpdate) {
    if (Object.prototype.hasOwnProperty.call(body, "dateOfBirth")) {
      data.dateOfBirth = d.dateOfBirth ? new Date(d.dateOfBirth) : null;
    }
    if (Object.prototype.hasOwnProperty.call(body, "sex")) {
      data.sex = d.sex || null;
    }
    if (Object.prototype.hasOwnProperty.call(body, "cpf")) {
      data.cpf = d.cpf ? encrypt(d.cpf) : null;
    }
    if (Object.prototype.hasOwnProperty.call(body, "addressLine1")) {
      data.addressLine1 = d.addressLine1 ? encrypt(d.addressLine1) : null;
    }
    if (Object.prototype.hasOwnProperty.call(body, "city")) {
      data.city = d.city || null;
    }
    if (Object.prototype.hasOwnProperty.call(body, "state")) {
      data.state = d.state || null;
    }
    if (Object.prototype.hasOwnProperty.call(body, "country")) {
      data.country = d.country || null;
    }
    if (Object.prototype.hasOwnProperty.call(body, "zipCode")) {
      data.zipCode = d.zipCode ? encrypt(d.zipCode) : null;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await db.patientRecord.update({
    where: { id: record.id },
    data,
  });

  // If we just linked to an existing account via email, attach this chart's
  // documents to the patient's profile (same as the original behavior).
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
    ...(wantsEmailChange ? { email: (data.email as string | null) ?? null, hasAccount: !!linkedUserId } : {}),
  });
}
