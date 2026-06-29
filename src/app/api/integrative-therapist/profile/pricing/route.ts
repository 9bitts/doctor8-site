import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { decryptIntegrativeNameFields, requireIntegrativeTherapist } from "@/lib/integrative-therapist-api";

export async function PATCH(req: NextRequest) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { session, therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const body = await req.json();
  const { consultPrice, currency, acceptsTeleconsult, acceptsInPerson, sessionDurationMins } = body;

  if (consultPrice == null || Number(consultPrice) <= 0) {
    return NextResponse.json({ error: "Invalid session price." }, { status: 400 });
  }

  const profile = await db.integrativeTherapistProfile.update({
    where: { id: therapist.id },
    data: {
      consultPrice: Number(consultPrice),
      currency: currency || "BRL",
      acceptsTeleconsult: Boolean(acceptsTeleconsult),
      acceptsInPerson: Boolean(acceptsInPerson),
      sessionDurationMins: Number(sessionDurationMins) || 50,
    },
  });

  await audit.updateRecord(session.user.id, "IntegrativeTherapistProfile", profile.id);
  return NextResponse.json({
    profile: decryptIntegrativeNameFields(profile),
    success: true,
  });
}
