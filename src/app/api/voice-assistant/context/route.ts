import { NextRequest, NextResponse } from "next/server";
import { isApiError } from "@/lib/api-auth";
import { getPortalVoiceExamples, getPrimaryVoiceExample } from "@/lib/voice-assistant/portal-examples";
import { requireVoiceAssistantApi } from "@/lib/voice-assistant/voice-assistant-auth";
import { resolveEffectiveSkillsPortal } from "@/lib/voice-assistant/voice-profile";
import type { VoicePortalId } from "@/lib/voice-assistant/types";

const portalIds = [
  "PROFESSIONAL",
  "PSYCHOLOGIST",
  "NUTRITIONIST",
  "NURSE",
  "PHARMACIST",
  "DENTIST",
  "PSYCHOANALYST",
  "INTEGRATIVE_THERAPIST",
] as const;

export async function GET(req: NextRequest) {
  const portalRaw = req.nextUrl.searchParams.get("portalId");
  if (!portalRaw || !portalIds.includes(portalRaw as VoicePortalId)) {
    return NextResponse.json({ error: "INVALID_PORTAL" }, { status: 400 });
  }
  const portalId = portalRaw as VoicePortalId;
  const pathname = req.nextUrl.searchParams.get("pathname") ?? undefined;

  const auth = await requireVoiceAssistantApi(portalId);
  if (isApiError(auth)) return auth.error;

  const skillsPortalId = resolveEffectiveSkillsPortal(pathname, auth.profile, portalId);
  const examples = getPortalVoiceExamples(skillsPortalId, auth.profile);
  const primaryExample = getPrimaryVoiceExample(skillsPortalId, auth.profile);

  return NextResponse.json({
    skillsPortalId,
    examples,
    primaryExample,
    specialty: auth.profile?.specialty ?? null,
  });
}
