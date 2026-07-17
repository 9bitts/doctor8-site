import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAcuraVolunteerProvider } from "@/lib/acura-volunteer";

const PROVIDER_ROLES = ["PROFESSIONAL", "PSYCHOANALYST", "INTEGRATIVE_THERAPIST"] as const;

async function loadProfile(userId: string, role: string) {
  if (role === "PROFESSIONAL") {
    return db.professionalProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        verified: true,
        acuraVolunteer: true,
        acuraVolunteerStatus: true,
      },
    });
  }
  if (role === "PSYCHOANALYST") {
    return db.psychoanalystProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        verified: true,
        acuraVolunteer: true,
        acuraVolunteerStatus: true,
      },
    });
  }
  if (role === "INTEGRATIVE_THERAPIST") {
    return db.integrativeTherapistProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        verified: true,
        acuraVolunteer: true,
        acuraVolunteerStatus: true,
      },
    });
  }
  return null;
}

/** Read-only: professionals can no longer self-toggle the Acura seal. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!PROVIDER_ROLES.includes(session.user.role as (typeof PROVIDER_ROLES)[number])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const profile = await loadProfile(session.user.id, session.user.role);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  return NextResponse.json({
    acuraVolunteer: profile.acuraVolunteer,
    acuraVolunteerStatus: profile.acuraVolunteerStatus,
    verified: profile.verified,
    badgeVisible: isAcuraVolunteerProvider(profile.verified, profile.acuraVolunteer),
  });
}

export async function PATCH() {
  return NextResponse.json(
    {
      error: "self_service_disabled",
      message: "O selo AcuraBrasil é concedido apenas após aprovação da equipe admin.",
    },
    { status: 403 },
  );
}
