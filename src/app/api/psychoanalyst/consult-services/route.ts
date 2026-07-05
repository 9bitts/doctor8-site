import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePsychoanalyst } from "@/lib/psychoanalyst-api";
import {
  ensureDefaultServiceFromLegacyPrice,
  getProviderServices,
  saveProviderServices,
  syncConsultPriceFromServices,
} from "@/lib/practice";

export async function GET() {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { psychoanalyst } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const profile = await db.psychoanalystProfile.findUnique({
    where: { id: psychoanalyst.id },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await ensureDefaultServiceFromLegacyPrice(profile.id, "psychoanalyst", profile);
  const services = await getProviderServices(profile.id, "psychoanalyst");

  return NextResponse.json({
    services,
    currency: profile.currency,
    acceptsTeleconsult: profile.acceptsTeleconsult,
    acceptsInPerson: profile.acceptsInPerson,
    sessionDurationMins: profile.sessionDurationMins,
  });
}

export async function PUT(req: NextRequest) {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { psychoanalyst } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const profile = await db.psychoanalystProfile.findUnique({
    where: { id: psychoanalyst.id },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const services = Array.isArray(body.services) ? body.services : [];
  const valid = services.filter(
    (s: { name?: string }) => typeof s.name === "string" && s.name.trim(),
  );
  if (valid.length === 0) {
    return NextResponse.json({ error: "Add at least one consultation type." }, { status: 400 });
  }

  await saveProviderServices(profile.id, "psychoanalyst", valid);

  const profilePatch: Record<string, unknown> = {};
  if (body.currency) profilePatch.currency = body.currency;
  if (body.acceptsTeleconsult !== undefined) profilePatch.acceptsTeleconsult = Boolean(body.acceptsTeleconsult);
  if (body.acceptsInPerson !== undefined) profilePatch.acceptsInPerson = Boolean(body.acceptsInPerson);
  if (body.sessionDurationMins !== undefined) {
    profilePatch.sessionDurationMins = Number(body.sessionDurationMins) || 50;
  }

  if (Object.keys(profilePatch).length > 0) {
    await db.psychoanalystProfile.update({ where: { id: profile.id }, data: profilePatch });
    await syncConsultPriceFromServices(profile.id, "psychoanalyst");
  }

  const updated = await getProviderServices(profile.id, "psychoanalyst");
  return NextResponse.json({ ok: true, services: updated });
}
