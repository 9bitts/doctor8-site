import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import {
  ensureLegacyLocation,
  getPracticeLocations,
  getProviderServices,
  savePracticeLocations,
  saveProviderServices,
} from "@/lib/practice";

export async function GET() {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const profile = await db.professionalProfile.findUnique({
    where: { userId: ctx.userId },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await ensureLegacyLocation(profile.id, "health", profile);
  const locations = await getPracticeLocations(profile.id, "health");
  const services = await getProviderServices(profile.id, "health");

  return NextResponse.json({ locations, services, currency: profile.currency });
}

export async function PUT(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const profile = await db.professionalProfile.findUnique({
    where: { userId: ctx.userId },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const locations = Array.isArray(body.locations) ? body.locations : [];
  const services = Array.isArray(body.services) ? body.services : [];

  await savePracticeLocations(profile.id, "health", locations);
  await saveProviderServices(profile.id, "health", services);

  return NextResponse.json({ ok: true });
}
