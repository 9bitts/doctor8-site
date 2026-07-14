import { NextResponse } from "next/server";
import { requireProfessionalApi, isApiError, type ApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { requirePsychoanalyst } from "@/lib/psychoanalyst-api";
import { requireIntegrativeTherapist } from "@/lib/integrative-therapist-api";
import type { VoicePortalId, VoiceProfileContext } from "./types";

export type VoiceAssistantAuth = {
  userId: string;
  role: string;
  portalId: VoicePortalId;
  providerId: string;
  profile: VoiceProfileContext | null;
};

const PROFESSIONAL_PORTALS: VoicePortalId[] = [
  "PROFESSIONAL",
  "PSYCHOLOGIST",
  "NUTRITIONIST",
  "NURSE",
  "PHARMACIST",
  "DENTIST",
];

function isProfessionalPortal(portalId: VoicePortalId): boolean {
  return PROFESSIONAL_PORTALS.includes(portalId);
}

async function loadProfessionalVoiceProfile(userId: string): Promise<VoiceProfileContext | null> {
  const profile = await db.professionalProfile.findUnique({
    where: { userId },
    select: {
      specialty: true,
      practicesIntegrativeMedicine: true,
    },
  });
  if (!profile) return null;
  return {
    specialty: profile.specialty,
    practicesIntegrativeMedicine: profile.practicesIntegrativeMedicine,
  };
}

async function loadIntegrativeVoiceProfile(userId: string): Promise<VoiceProfileContext | null> {
  const profile = await db.integrativeTherapistProfile.findUnique({
    where: { userId },
    select: { picsPractices: true },
  });
  if (!profile) return null;
  return { picsPractices: profile.picsPractices };
}

export async function requireVoiceAssistantApi(
  portalId: VoicePortalId,
): Promise<VoiceAssistantAuth | ApiError> {
  if (portalId === "PSYCHOANALYST") {
    const ctx = await requirePsychoanalyst();
    if ("error" in ctx) {
      return { error: ctx.error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    return {
      userId: ctx.session.user!.id!,
      role: "PSYCHOANALYST",
      portalId,
      providerId: ctx.psychoanalyst.id,
      profile: null,
    };
  }

  if (portalId === "INTEGRATIVE_THERAPIST") {
    const ctx = await requireIntegrativeTherapist();
    if ("error" in ctx) {
      return { error: ctx.error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    const profile = await loadIntegrativeVoiceProfile(ctx.session.user!.id!);
    return {
      userId: ctx.session.user!.id!,
      role: "INTEGRATIVE_THERAPIST",
      portalId,
      providerId: ctx.therapist.id,
      profile,
    };
  }

  if (!isProfessionalPortal(portalId)) {
    return { error: NextResponse.json({ error: "UNSUPPORTED_PORTAL" }, { status: 400 }) };
  }

  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx;
  const profile = await loadProfessionalVoiceProfile(ctx.userId);
  return {
    userId: ctx.userId,
    role: "PROFESSIONAL",
    portalId,
    providerId: ctx.professional.id,
    profile,
  };
}
