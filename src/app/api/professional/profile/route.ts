// src/app/api/professional/profile/route.ts
// GET: load the logged-in professional's profile
// POST: create or update it, and mark as verified so they appear in patient search

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const profile = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ profile });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const {
    firstName, lastName, specialty, licenseNumber, licenseState,
    bio, consultPrice, currency, acceptsTeleconsult, acceptsInPerson,
    clinicName, clinicCity, clinicCountry,
  } = body;

  // Basic validation
  if (!firstName || !lastName || !licenseNumber || !specialty || !consultPrice) {
    return NextResponse.json(
      { error: "Missing required fields: name, registration number, profession and price." },
      { status: 400 }
    );
  }

  // A profile is "verified" (visible in search) once it has the essentials
  const isComplete = Boolean(
    firstName && lastName && licenseNumber && specialty && consultPrice > 0
  );

  const data = {
    firstName,
    lastName,
    specialty,
    licenseNumber,
    licenseState: licenseState || null,
    bio: bio || null,
    consultPrice: Number(consultPrice),
    currency: currency || "USD",
    acceptsTeleconsult: Boolean(acceptsTeleconsult),
    acceptsInPerson: Boolean(acceptsInPerson),
    clinicName: clinicName || null,
    clinicCity: clinicCity || null,
    clinicCountry: clinicCountry || null,
    verified: isComplete,
    verifiedAt: isComplete ? new Date() : null,
  };

  const existing = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });

  let profile;
  if (existing) {
    profile = await db.professionalProfile.update({
      where: { userId: session.user.id },
      data,
    });
    await audit.updateRecord(session.user.id, "ProfessionalProfile", profile.id);
  } else {
    profile = await db.professionalProfile.create({
      data: {
        userId: session.user.id,
        licenseCountry: clinicCountry || "US",
        ...data,
      },
    });
    await audit.createRecord(session.user.id, "ProfessionalProfile", profile.id);
  }

  return NextResponse.json({ profile, success: true });
}
