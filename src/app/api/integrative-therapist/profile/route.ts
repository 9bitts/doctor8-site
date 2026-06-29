import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { PICS_SLUGS } from "@/lib/pics/practices";
import { INTEGRATIVE_THERAPY_SPECIALTY } from "@/lib/integrative-therapy-specialty";
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
    phone,
    picsPractices,
    trainingInstitution,
    certifications,
    yearsOfPractice,
    bio,
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

  const practiceList = Array.isArray(picsPractices)
    ? picsPractices.filter((s: string) => PICS_SLUGS.includes(s))
    : [];

  if (practiceList.length === 0) {
    return NextResponse.json({ error: "Select at least one PICS practice." }, { status: 400 });
  }

  const existing = await db.integrativeTherapistProfile.findUnique({
    where: { id: therapist.id },
  });

  const isComplete = Boolean(
    firstName &&
      lastName &&
      trainingInstitution &&
      practiceList.length > 0 &&
      (existing?.consultPrice ?? 0) > 0,
  );

  const profile = await db.integrativeTherapistProfile.update({
    where: { id: therapist.id },
    data: {
      firstName,
      lastName,
      phone: phone || null,
      picsPractices: practiceList,
      trainingInstitution,
      certifications: certifications || null,
      yearsOfPractice: Number(yearsOfPractice) || 0,
      bio: bio || null,
      avatarUrl: avatarUrl || null,
      clinicName: clinicName || null,
      clinicAddress: clinicAddress || null,
      clinicCity: clinicCity || null,
      clinicState: clinicState || null,
      clinicCountry: clinicCountry || null,
      clinicZip: clinicZip || null,
    },
  });

  const { ensureVirtualCard } = await import("@/lib/public-profile");
  await ensureVirtualCard({
    integrativeTherapistId: profile.id,
    firstName,
    lastName,
    specialty: INTEGRATIVE_THERAPY_SPECIALTY,
    clinicCity: profile.clinicCity,
  });

  await audit.updateRecord(session.user.id, "IntegrativeTherapistProfile", profile.id);
  return NextResponse.json({
    profile: decryptIntegrativeNameFields(profile),
    success: true,
    profileComplete: isComplete,
  });
}
