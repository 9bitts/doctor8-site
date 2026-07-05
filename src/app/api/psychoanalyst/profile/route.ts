import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { decryptPsychoanalystNameFields, requirePsychoanalyst } from "@/lib/psychoanalyst-api";
import { getProviderServices, hasActiveConsultServices } from "@/lib/practice";

export async function GET() {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { psychoanalyst } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const profile = await db.psychoanalystProfile.findUnique({
    where: { id: psychoanalyst.id },
  });

  return NextResponse.json({ profile: profile ? decryptPsychoanalystNameFields(profile) : null });
}

export async function POST(req: NextRequest) {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { session, psychoanalyst } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const body = await req.json();
  const {
    firstName,
    lastName,
    trainingInstitution,
    personalAnalysisDone,
    theoreticalStudyDone,
    clinicalSupervision,
    yearsOfPractice,
    theoreticalLineage,
    associations,
    publications,
    otherRegulatedProfession,
    bio,
    consultPrice,
    currency,
    acceptsTeleconsult,
    acceptsInPerson,
    sessionDurationMins,
    avatarUrl,
    clinicName,
    clinicAddress,
    clinicCity,
    clinicState,
    clinicCountry,
    clinicZip,
  } = body;

  if (!firstName || !lastName || !trainingInstitution) {
    return NextResponse.json(
      { error: "Missing required fields: name and training institution." },
      { status: 400 },
    );
  }

  const existing = await db.psychoanalystProfile.findUnique({
    where: { id: psychoanalyst.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const assocArray = Array.isArray(associations)
    ? associations
    : typeof associations === "string" && associations.length
      ? associations.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

  const services = await getProviderServices(psychoanalyst.id, "psychoanalyst", true);
  const isComplete = Boolean(
    firstName &&
      lastName &&
      trainingInstitution &&
      hasActiveConsultServices(services) &&
      personalAnalysisDone &&
      theoreticalStudyDone &&
      clinicalSupervision,
  );

  const data = {
    firstName,
    lastName,
    trainingInstitution,
    personalAnalysisDone: Boolean(personalAnalysisDone),
    theoreticalStudyDone: Boolean(theoreticalStudyDone),
    clinicalSupervision: Boolean(clinicalSupervision),
    yearsOfPractice: Number(yearsOfPractice) || 0,
    theoreticalLineage: theoreticalLineage || null,
    associations: assocArray,
    publications: publications || null,
    otherRegulatedProfession: otherRegulatedProfession || null,
    bio: bio || null,
    consultPrice: consultPrice != null ? Number(consultPrice) : existing.consultPrice,
    currency: currency || existing.currency,
    acceptsTeleconsult:
      acceptsTeleconsult !== undefined ? Boolean(acceptsTeleconsult) : existing.acceptsTeleconsult,
    acceptsInPerson:
      acceptsInPerson !== undefined ? Boolean(acceptsInPerson) : existing.acceptsInPerson,
    sessionDurationMins:
      sessionDurationMins != null ? Number(sessionDurationMins) || 50 : existing.sessionDurationMins,
    avatarUrl: avatarUrl || null,
    clinicName: clinicName || null,
    clinicAddress: clinicAddress || null,
    clinicCity: clinicCity || null,
    clinicState: clinicState || null,
    clinicCountry: clinicCountry || null,
    clinicZip: clinicZip || null,
  };

  const profile = await db.psychoanalystProfile.update({
    where: { id: psychoanalyst.id },
    data,
  });

  const { ensureVirtualCard } = await import("@/lib/public-profile");
  const { PSYCHOANALYSIS_SPECIALTY } = await import("@/lib/professions");
  await ensureVirtualCard({
    psychoanalystId: profile.id,
    firstName,
    lastName,
    specialty: PSYCHOANALYSIS_SPECIALTY,
    clinicCity: profile.clinicCity,
  });

  await audit.updateRecord(session.user.id, "PsychoanalystProfile", profile.id);
  return NextResponse.json({ profile, success: true, profileComplete: isComplete });
}
