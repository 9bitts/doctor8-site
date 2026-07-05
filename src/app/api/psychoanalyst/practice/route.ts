import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePsychoanalyst } from "@/lib/psychoanalyst-api";
import {
  ensureDefaultServiceFromLegacyPrice,
  ensureLegacyLocation,
  getPracticeLocations,
  getProviderServices,
  savePracticeLocations,
  saveProviderServices,
} from "@/lib/practice";

export async function GET() {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { psychoanalyst } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const profile = await db.psychoanalystProfile.findUnique({
    where: { id: psychoanalyst.id },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await ensureLegacyLocation(profile.id, "psychoanalyst", profile);
  await ensureDefaultServiceFromLegacyPrice(profile.id, "psychoanalyst", profile);
  const locations = await getPracticeLocations(profile.id, "psychoanalyst");
  const services = await getProviderServices(profile.id, "psychoanalyst");

  return NextResponse.json({ locations, services, currency: profile.currency });
}

export async function PUT(req: NextRequest) {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { psychoanalyst } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const body = await req.json();
  const locations = Array.isArray(body.locations) ? body.locations : [];

  await savePracticeLocations(psychoanalyst.id, "psychoanalyst", locations);
  if (Array.isArray(body.services)) {
    await saveProviderServices(psychoanalyst.id, "psychoanalyst", body.services);
  }

  return NextResponse.json({ ok: true });
}
