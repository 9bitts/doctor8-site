// src/app/api/patient/profile/route.ts
// P1-e — the patient manages their own registration data (name, birth, phone,
// sex, CPF, address). These are the same fields the prescription (CFM) needs.
//
// GET   — returns the current patient's profile (decrypted)
// PATCH — updates the fields the patient is allowed to edit
//
// Encryption follows the same convention used elsewhere in the system:
//   encrypted (PHI): firstName, lastName, dateOfBirth(*), phone, addressLine1,
//                    addressLine2, zipCode, cpf
//   plain text:      city, state, country, sex
// (*) dateOfBirth is a real Date column on PatientProfile, so it is stored as a
//     Date (not encrypted) — same as the chart. We just pass it through.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { z } from "zod";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

const patchSchema = z.object({
  firstName: z.string().max(100).optional().or(z.literal("")),
  lastName: z.string().max(100).optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  sex: z.string().max(10).optional().or(z.literal("")),
  cpf: z.string().max(30).optional().or(z.literal("")),
  addressLine1: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  state: z.string().max(100).optional().or(z.literal("")),
  country: z.string().max(60).optional().or(z.literal("")),
  zipCode: z.string().max(30).optional().or(z.literal("")),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const profile = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

  // cpf is a new column; read it defensively in case the client wasn't regenerated yet
  const cpfRaw = (profile as { cpf?: string | null }).cpf ?? null;
  const sexRaw = (profile as { sex?: string | null }).sex ?? null;

  return NextResponse.json({
    profile: {
      firstName: safeDecrypt(profile.firstName),
      lastName: safeDecrypt(profile.lastName),
      dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.toISOString().slice(0, 10) : "",
      phone: profile.phone ? safeDecrypt(profile.phone) : "",
      sex: sexRaw || "",
      cpf: cpfRaw ? safeDecrypt(cpfRaw) : "",
      addressLine1: profile.addressLine1 ? safeDecrypt(profile.addressLine1) : "",
      city: profile.city || "",
      state: profile.state || "",
      country: profile.country || "",
      zipCode: profile.zipCode ? safeDecrypt(profile.zipCode) : "",
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const profile = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  const d = parsed.data;

  // Update only the fields that were actually sent (don't wipe others).
  const data: Record<string, unknown> = {};
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);

  // firstName/lastName are required (non-null) on PatientProfile — only update
  // them when a non-empty value is sent, so the account name can't be wiped.
  if (has("firstName") && d.firstName && d.firstName.trim()) data.firstName = encrypt(d.firstName.trim());
  if (has("lastName") && d.lastName && d.lastName.trim()) data.lastName = encrypt(d.lastName.trim());
  if (has("dateOfBirth")) data.dateOfBirth = d.dateOfBirth ? new Date(d.dateOfBirth) : null;
  if (has("phone")) data.phone = d.phone ? encrypt(d.phone) : null;
  if (has("sex")) data.sex = d.sex || null;
  if (has("cpf")) data.cpf = d.cpf ? encrypt(d.cpf) : null;
  if (has("addressLine1")) data.addressLine1 = d.addressLine1 ? encrypt(d.addressLine1) : null;
  if (has("city")) data.city = d.city || null;
  if (has("state")) data.state = d.state || null;
  if (has("country")) data.country = d.country || null;
  if (has("zipCode")) data.zipCode = d.zipCode ? encrypt(d.zipCode) : null;

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  await db.patientProfile.update({
    where: { id: profile.id },
    data,
  });

  return NextResponse.json({ success: true });
}
