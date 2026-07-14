// src/app/api/professional/onboarding-status/route.ts
// Returns the onboarding checklist state for the current professional.
// Checks: profile completeness, availability slots, patients, prescriptions,
// JIT sessions, and library resources.

import { NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import {
  getStripeConnectStatusForProfile,
  isStripeConnectEnabled,
} from "@/lib/stripe-connect";
import { medicationListHasIntegrativeItems } from "@/lib/integrative-medicine/integrative-prescription-utils";

export async function GET() {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const professional = await db.professionalProfile.findUnique({
    where: { id: ctx.professional.id },
    select: {
      id:            true,
      firstName:     true,
      lastName:      true,
      specialty:     true,
      licenseNumber: true,
      avatarUrl:     true,
      bio:           true,
      digitalSignCpf: true,
      integrativeHubSeenAt: true,
      practicesIntegrativeMedicine: true,
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

  // Went online at least once (session row is created only when activating plantão)
  const jitCount = await db.jitSession.count({
    where: { professionalId: professional.id },
  });

  // At least 1 resource in library
  const resourceCount = await db.resource.count({
    where: { professionalId: professional.id, active: true },
  });

  const connectEnabled = isStripeConnectEnabled();
  const connectStatus = connectEnabled
    ? await getStripeConnectStatusForProfile(professional.id)
    : null;

  const recentRx = await db.prescription.findMany({
    where: { professionalId: professional.id },
    select: { medications: true },
    take: 30,
  });
  const hasIntegrativeRx = recentRx.some((p) => medicationListHasIntegrativeItems(p.medications));

  const hasExploredIntegrative =
    !!professional.integrativeHubSeenAt ||
    !!professional.practicesIntegrativeMedicine ||
    hasIntegrativeRx;

  return NextResponse.json({
    hasProfile:      hasProfile,
    hasAvailability: availCount > 0,
    hasPatient:      patientCount > 0,
    hasPrescription: rxCount > 0,
    hasJit:          jitCount > 0,
    hasResource:     resourceCount > 0,
    hasDigitalSign:  !!professional.digitalSignCpf,
    stripeConnectEnabled: connectEnabled,
    hasStripeConnect: connectStatus === "active",
    hasExploredIntegrative,
    hasIntegrativeRx,
  });
}
