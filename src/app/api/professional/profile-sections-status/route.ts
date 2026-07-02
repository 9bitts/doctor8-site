// GET ? completion status for each Meu Perfil section.

import { NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function GET() {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const profile = await db.professionalProfile.findUnique({
    where: { userId: ctx.userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      specialty: true,
      licenseNumber: true,
      avatarUrl: true,
      bio: true,
      consultPrice: true,
      digitalSignCpf: true,
      verified: true,
      virtualCard: { select: { isPublic: true } },
    },
  });

  if (!profile) {
    return NextResponse.json({
      identity: false,
      credentials: false,
      consultation: false,
      availability: false,
      digitalSign: false,
      doctorConnection: false,
      canGoPublic: false,
      isPublic: false,
      verified: false,
    });
  }

  const availCount = await db.availabilitySlot.count({
    where: { professionalId: profile.id, isActive: true },
  });

  const subscription = await db.subscription.findFirst({
    where: {
      userId: ctx.userId,
      status: { in: ["active", "trialing"] },
    },
    select: { id: true },
  });

  const identity = !!(profile.firstName && profile.lastName && (profile.avatarUrl || profile.bio));
  const credentials = !!(profile.firstName && profile.lastName && profile.licenseNumber && profile.specialty);
  const consultation = (profile.consultPrice ?? 0) > 0;
  const availability = availCount > 0;
  const digitalSign = !!profile.digitalSignCpf;
  const doctorConnection = !!subscription;
  const canGoPublic = credentials && consultation && availability;

  return NextResponse.json({
    identity,
    credentials,
    consultation,
    availability,
    digitalSign,
    doctorConnection,
    canGoPublic,
    isPublic: profile.virtualCard?.isPublic ?? false,
    verified: profile.verified,
  });
}
