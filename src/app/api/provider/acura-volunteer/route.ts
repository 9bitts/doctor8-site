import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

const PROVIDER_ROLES = ["PROFESSIONAL", "PSYCHOANALYST", "INTEGRATIVE_THERAPIST"] as const;

async function loadProfile(userId: string, role: string) {
  if (role === "PROFESSIONAL") {
    return db.professionalProfile.findUnique({
      where: { userId },
      select: { id: true, verified: true, acuraVolunteer: true },
    });
  }
  if (role === "PSYCHOANALYST") {
    return db.psychoanalystProfile.findUnique({
      where: { userId },
      select: { id: true, verified: true, acuraVolunteer: true },
    });
  }
  if (role === "INTEGRATIVE_THERAPIST") {
    return db.integrativeTherapistProfile.findUnique({
      where: { userId },
      select: { id: true, verified: true, acuraVolunteer: true },
    });
  }
  return null;
}

async function updateProfile(userId: string, role: string, acuraVolunteer: boolean) {
  if (role === "PROFESSIONAL") {
    return db.professionalProfile.update({
      where: { userId },
      data: { acuraVolunteer },
      select: { acuraVolunteer: true, verified: true },
    });
  }
  if (role === "PSYCHOANALYST") {
    return db.psychoanalystProfile.update({
      where: { userId },
      data: { acuraVolunteer },
      select: { acuraVolunteer: true, verified: true },
    });
  }
  if (role === "INTEGRATIVE_THERAPIST") {
    return db.integrativeTherapistProfile.update({
      where: { userId },
      data: { acuraVolunteer },
      select: { acuraVolunteer: true, verified: true },
    });
  }
  return null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!PROVIDER_ROLES.includes(session.user.role as typeof PROVIDER_ROLES[number])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const profile = await loadProfile(session.user.id, session.user.role);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  return NextResponse.json({
    acuraVolunteer: profile.acuraVolunteer,
    verified: profile.verified,
    badgeVisible: profile.verified && profile.acuraVolunteer,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!PROVIDER_ROLES.includes(session.user.role as typeof PROVIDER_ROLES[number])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  if (typeof body.acuraVolunteer !== "boolean") {
    return NextResponse.json({ error: "acuraVolunteer must be a boolean" }, { status: 400 });
  }

  const existing = await loadProfile(session.user.id, session.user.role);
  if (!existing) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  if (body.acuraVolunteer && !existing.verified) {
    return NextResponse.json({ error: "verified_required" }, { status: 403 });
  }

  const updated = await updateProfile(session.user.id, session.user.role, body.acuraVolunteer);
  if (!updated) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  await audit.updateRecord(session.user.id, "AcuraVolunteer", existing.id);

  return NextResponse.json({
    acuraVolunteer: updated.acuraVolunteer,
    verified: updated.verified,
    badgeVisible: updated.verified && updated.acuraVolunteer,
  });
}
