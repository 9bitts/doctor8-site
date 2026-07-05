import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireIntegrativeTherapist } from "@/lib/integrative-therapist-api";
import {
  ensureDefaultServiceFromLegacyPrice,
  ensureLegacyLocation,
  getPracticeLocations,
  getProviderServices,
  savePracticeLocations,
  saveProviderServices,
} from "@/lib/practice";

export async function GET() {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const profile = await db.integrativeTherapistProfile.findUnique({
    where: { id: therapist.id },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await ensureLegacyLocation(profile.id, "integrative_therapist", profile);
  await ensureDefaultServiceFromLegacyPrice(profile.id, "integrative_therapist", profile);
  const locations = await getPracticeLocations(profile.id, "integrative_therapist");
  const services = await getProviderServices(profile.id, "integrative_therapist");

  return NextResponse.json({ locations, services, currency: profile.currency });
}

export async function PUT(req: NextRequest) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const body = await req.json();
  const locations = Array.isArray(body.locations) ? body.locations : [];

  await savePracticeLocations(therapist.id, "integrative_therapist", locations);
  if (Array.isArray(body.services)) {
    await saveProviderServices(therapist.id, "integrative_therapist", body.services);
  }

  return NextResponse.json({ ok: true });
}
