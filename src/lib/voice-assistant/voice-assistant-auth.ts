import { NextResponse } from "next/server";
import { requireProfessionalApi, isApiError, type ApiError } from "@/lib/api-auth";
import { requirePsychoanalyst } from "@/lib/psychoanalyst-api";
import { requireIntegrativeTherapist } from "@/lib/integrative-therapist-api";
import type { VoicePortalId } from "./types";

export type VoiceAssistantAuth = {
  userId: string;
  role: string;
  portalId: VoicePortalId;
  providerId: string;
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
    };
  }

  if (portalId === "INTEGRATIVE_THERAPIST") {
    const ctx = await requireIntegrativeTherapist();
    if ("error" in ctx) {
      return { error: ctx.error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    return {
      userId: ctx.session.user!.id!,
      role: "INTEGRATIVE_THERAPIST",
      portalId,
      providerId: ctx.therapist.id,
    };
  }

  if (!isProfessionalPortal(portalId)) {
    return { error: NextResponse.json({ error: "UNSUPPORTED_PORTAL" }, { status: 400 }) };
  }

  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx;
  return {
    userId: ctx.userId,
    role: "PROFESSIONAL",
    portalId,
    providerId: ctx.professional.id,
  };
}
