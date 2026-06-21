// src/app/api/professional/onboarding-status/route.ts
// Returns the onboarding checklist state for the current professional.
// Checks: profile completeness, availability slots, patients, prescriptions,
// JIT sessions, and library resources.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id:            true,
      firstName:     true,
      lastName:      true,
      specialty:     true,
      licenseNumber: true,
      avatarUrl:     true,
      bio:           true,
    },
  });

  if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

  // Profile completeness — needs name, specialty, license and bio/avatar
  const hasProfile =
    !!professional.firstName &&
    !!professional.lastName &&
    !!professional.specialty &&
    !!professional.licenseNumber &&
    !!(professional.bio || professional.avatarUrl);

  // At least 1 availability slot
  const availCount = await db.availabilitySlot.count({
    where: { professionalId: professional.id, isActive: true },
  });

  // At least 1 patient record
  const patientCount = await db.patientRecord.count({
    where: { professionalId: professional.id },
  });

  // At least 1 prescription
  const rxCount = await db.prescription.count({
    where: { professionalId: professional.id },
  });

  // Has used JIT (at least 1 session ever created)
  const jitCount = await db.jitSession.count({
    where: { professionalId: professional.id },
  });

  // At least 1 resource in library
  const resourceCount = await db.resource.count({
    where: { professionalId: professional.id, active: true },
  });

  return NextResponse.json({
    hasProfile:      hasProfile,
    hasAvailability: availCount > 0,
    hasPatient:      patientCount > 0,
    hasPrescription: rxCount > 0,
    hasJit:          jitCount > 0,
    hasResource:     resourceCount > 0,
  });
}
