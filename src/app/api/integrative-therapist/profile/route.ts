import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { PICS_SLUGS } from "@/lib/pics/practices";
import { decryptIntegrativeNameFields, requireIntegrativeTherapist } from "@/lib/integrative-therapist-api";

export async function GET() {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const profile = await db.integrativeTherapistProfile.findUnique({
    where: { id: therapist.id },
  });

  return NextResponse.json({
    profile: profile ? decryptIntegrativeNameFields(profile) : null,
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { session, therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const body = await req.json();
  const {
    firstName,
    lastName,
    picsPractices,
    trainingInstitution,
    certifications,
    yearsOfPractice,
    bio,
    consultPrice,
    currency,
    acceptsTeleconsult,
    acceptsInPerson,
    sessionDurationMins,
    clinicName,
    clinicCity,
    clinicCountry,
  } = body;

  if (!firstName || !lastName || !trainingInstitution || consultPrice == null) {
    return NextResponse.json(
      { error: "Missing required fields: name, training institution and price." },
      { status: 400 },
    );
  }

  const practiceList = Array.isArray(picsPractices)
    ? picsPractices.filter((s: string) => PICS_SLUGS.includes(s))
    : [];

  const isComplete = Boolean(
    firstName &&
      lastName &&
      trainingInstitution &&
      Number(consultPrice) > 0 &&
      practiceList.length > 0,
  );

  const profile = await db.integrativeTherapistProfile.update({
    where: { id: therapist.id },
    data: {
      firstName,
      lastName,
      picsPractices: practiceList,
      trainingInstitution,
      certifications: certifications || null,
      yearsOfPractice: Number(yearsOfPractice) || 0,
      bio: bio || null,
      consultPrice: Number(consultPrice),
      currency: currency || "USD",
      acceptsTeleconsult: Boolean(acceptsTeleconsult),
      acceptsInPerson: Boolean(acceptsInPerson),
      sessionDurationMins: Number(sessionDurationMins) || 50,
      clinicName: clinicName || null,
      clinicCity: clinicCity || null,
      clinicCountry: clinicCountry || null,
    },
  });

  await audit.updateRecord(session.user.id, "IntegrativeTherapistProfile", profile.id);
  return NextResponse.json({ profile, success: true, profileComplete: isComplete });
}
