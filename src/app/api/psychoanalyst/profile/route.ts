import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requirePsychoanalyst } from "@/lib/psychoanalyst-api";

export async function GET() {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { psychoanalyst } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const profile = await db.psychoanalystProfile.findUnique({
    where: { id: psychoanalyst.id },
  });

  return NextResponse.json({ profile });
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

  if (!firstName || !lastName || !trainingInstitution || consultPrice == null) {
    return NextResponse.json(
      { error: "Missing required fields: name, training institution and price." },
      { status: 400 }
    );
  }

  const assocArray = Array.isArray(associations)
    ? associations
    : typeof associations === "string" && associations.length
      ? associations.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

  const isComplete = Boolean(
    firstName &&
      lastName &&
      trainingInstitution &&
      Number(consultPrice) > 0 &&
      personalAnalysisDone &&
      theoreticalStudyDone &&
      clinicalSupervision
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
    consultPrice: Number(consultPrice),
    currency: currency || "USD",
    acceptsTeleconsult: Boolean(acceptsTeleconsult),
    acceptsInPerson: Boolean(acceptsInPerson),
    sessionDurationMins: Number(sessionDurationMins) || 50,
    avatarUrl: avatarUrl || null,
    clinicName: clinicName || null,
    clinicAddress: clinicAddress || null,
    clinicCity: clinicCity || null,
    clinicState: clinicState || null,
    clinicCountry: clinicCountry || null,
    clinicZip: clinicZip || null,
    verified: isComplete,
    verifiedAt: isComplete ? new Date() : null,
  };

  const profile = await db.psychoanalystProfile.update({
    where: { id: psychoanalyst.id },
    data,
  });

  await audit.updateRecord(session.user.id, "PsychoanalystProfile", profile.id);
  return NextResponse.json({ profile, success: true });
}
