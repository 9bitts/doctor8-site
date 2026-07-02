// src/app/api/professional/profile/route.ts
// GET: load the logged-in professional's profile
// POST: create or update it, and mark as verified so they appear in patient search
// Stores photo (avatarUrl), areas of expertise (subspecialties) and full clinic address.

import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function GET() {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const profile = await db.professionalProfile.findUnique({
    where: { userId: ctx.userId },
  });

  return NextResponse.json({ profile });
}

export async function POST(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json();
  const {
    firstName, lastName, specialty, subspecialties, licenseNumber, licenseState,
    bio, consultPrice, currency, acceptsTeleconsult, acceptsInPerson,
    avatarUrl, clinicName, clinicAddress, clinicCity, clinicState, clinicCountry, clinicZip,
  } = body;

  const existing = await db.professionalProfile.findUnique({
    where: { userId: ctx.userId },
  });

  const resolvedConsultPrice =
    consultPrice !== undefined && consultPrice !== null && consultPrice !== ""
      ? Number(consultPrice)
      : existing?.consultPrice;

  if (!firstName || !lastName || !licenseNumber || !specialty) {
    return NextResponse.json(
      { error: "Missing required fields: name, registration number and profession." },
      { status: 400 },
    );
  }

  if (!existing && (!resolvedConsultPrice || resolvedConsultPrice <= 0)) {
    return NextResponse.json(
      { error: "Missing required fields: consultation price." },
      { status: 400 },
    );
  }

  const isComplete = Boolean(
    firstName && lastName && licenseNumber && specialty && (resolvedConsultPrice ?? 0) > 0,
  );

  // subspecialties is an array column
  const subsArray = Array.isArray(subspecialties)
    ? subspecialties
    : typeof subspecialties === "string" && subspecialties.length
    ? subspecialties.split(",").map((s: string) => s.trim()).filter(Boolean)
    : [];

  const data = {
    firstName,
    lastName,
    specialty,
    subspecialties: subsArray,
    licenseNumber,
    licenseState: licenseState || null,
    bio: bio || null,
    consultPrice: resolvedConsultPrice ?? 0,
    currency: currency ?? existing?.currency ?? "USD",
    acceptsTeleconsult:
      acceptsTeleconsult !== undefined
        ? Boolean(acceptsTeleconsult)
        : existing?.acceptsTeleconsult ?? true,
    acceptsInPerson:
      acceptsInPerson !== undefined
        ? Boolean(acceptsInPerson)
        : existing?.acceptsInPerson ?? false,
    avatarUrl: avatarUrl || null,
    clinicName: clinicName || null,
    clinicAddress: clinicAddress || null,
    clinicCity: clinicCity || null,
    clinicState: clinicState || null,
    clinicCountry: clinicCountry || null,
    clinicZip: clinicZip || null,
  };

  let profile;
  if (existing) {
    profile = await db.professionalProfile.update({ where: { userId: ctx.userId }, data });
    await audit.updateRecord(ctx.userId, "ProfessionalProfile", profile.id);
  } else {
    profile = await db.professionalProfile.create({
      data: {
        userId: ctx.userId,
        licenseCountry: clinicCountry || null,
        verified: false,
        ...data,
      },
    });
    await audit.createRecord(ctx.userId, "ProfessionalProfile", profile.id);
  }

  const { ensureVirtualCard } = await import("@/lib/public-profile");
  await ensureVirtualCard({
    professionalId: profile.id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    specialty: profile.specialty,
    clinicCity: profile.clinicCity,
  });

  return NextResponse.json({ profile, success: true, profileComplete: isComplete });
}

/** PATCH — partial update (auto-save). Only updates fields present in the body. */
export async function PATCH(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json();
  const existing = await db.professionalProfile.findUnique({
    where: { userId: ctx.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const allowed = [
    "avatarUrl", "firstName", "lastName", "specialty", "subspecialties",
    "licenseNumber", "licenseState", "bio", "consultPrice", "currency",
    "acceptsTeleconsult", "acceptsInPerson",
    "clinicName", "clinicAddress", "clinicCity", "clinicState", "clinicCountry", "clinicZip",
  ] as const;

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      if (key === "subspecialties") {
        const raw = body.subspecialties;
        data.subspecialties = Array.isArray(raw)
          ? raw
          : typeof raw === "string" && raw.length
          ? raw.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];
      } else if (key === "consultPrice") {
        data.consultPrice = Number(body.consultPrice);
      } else if (key === "acceptsTeleconsult" || key === "acceptsInPerson") {
        data[key] = Boolean(body[key]);
      } else {
        data[key] = body[key] ?? null;
      }
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const profile = await db.professionalProfile.update({
    where: { userId: ctx.userId },
    data,
  });

  await audit.updateRecord(ctx.userId, "ProfessionalProfile", profile.id);

  const { ensureVirtualCard } = await import("@/lib/public-profile");
  await ensureVirtualCard({
    professionalId: profile.id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    specialty: profile.specialty,
    clinicCity: profile.clinicCity,
  });

  const isComplete = Boolean(
    profile.firstName &&
      profile.lastName &&
      profile.licenseNumber &&
      profile.specialty &&
      profile.consultPrice > 0,
  );

  return NextResponse.json({ profile, success: true, profileComplete: isComplete });
}
