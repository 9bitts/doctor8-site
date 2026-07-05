import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import {
  ensureDefaultServiceFromLegacyPrice,
  getProviderServices,
  saveProviderServices,
  syncConsultPriceFromServices,
} from "@/lib/practice";

export async function GET() {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const profile = await db.professionalProfile.findUnique({
    where: { userId: ctx.userId },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await ensureDefaultServiceFromLegacyPrice(profile.id, "health", profile);
  const services = await getProviderServices(profile.id, "health");

  return NextResponse.json({
    services,
    currency: profile.currency,
    acceptsTeleconsult: profile.acceptsTeleconsult,
    acceptsInPerson: profile.acceptsInPerson,
  });
}

export async function PUT(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const profile = await db.professionalProfile.findUnique({
    where: { userId: ctx.userId },
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

  await saveProviderServices(profile.id, "health", valid);

  const profilePatch: Record<string, unknown> = {};
  if (body.currency) profilePatch.currency = body.currency;
  if (body.acceptsTeleconsult !== undefined) profilePatch.acceptsTeleconsult = Boolean(body.acceptsTeleconsult);
  if (body.acceptsInPerson !== undefined) profilePatch.acceptsInPerson = Boolean(body.acceptsInPerson);

  if (Object.keys(profilePatch).length > 0) {
    await db.professionalProfile.update({
      where: { id: profile.id },
      data: profilePatch,
    });
    await syncConsultPriceFromServices(profile.id, "health");
  }

  const updated = await getProviderServices(profile.id, "health");
  return NextResponse.json({ ok: true, services: updated });
}
