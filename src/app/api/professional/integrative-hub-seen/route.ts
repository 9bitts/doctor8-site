import { NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function POST() {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  await db.professionalProfile.update({
    where: { id: ctx.professional.id },
    data: { integrativeHubSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
