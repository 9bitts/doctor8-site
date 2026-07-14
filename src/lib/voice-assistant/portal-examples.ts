import { getSkillsForProfile } from "./skill-registry";
import type { VoicePortalId, VoiceProfileContext } from "./types";

/** Up to 3 spoken-command examples tailored to the clinical portal and profile. */
export function getPortalVoiceExamples(
  portalId: VoicePortalId,
  profile?: VoiceProfileContext | null,
): string[] {
  const out: string[] = [];
  for (const skill of getSkillsForProfile(portalId, profile)) {
    for (const example of skill.examples) {
      if (out.length >= 3) return out;
      if (!out.includes(example)) out.push(example);
    }
  }
  return out;
}

export function getPrimaryVoiceExample(
  portalId: VoicePortalId,
  profile?: VoiceProfileContext | null,
): string | null {
  return getPortalVoiceExamples(portalId, profile)[0] ?? null;
}

export function formatVoiceHint(
  portalId: VoicePortalId,
  fallback: string,
  profile?: VoiceProfileContext | null,
): string {
  const primary = getPrimaryVoiceExample(portalId, profile);
  if (!primary) return fallback;
  return primary;
}
