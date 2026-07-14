import { getSkillsForPortal } from "./skill-registry";
import type { VoicePortalId } from "./types";

/** Up to 3 spoken-command examples tailored to the clinical portal. */
export function getPortalVoiceExamples(portalId: VoicePortalId): string[] {
  const out: string[] = [];
  for (const skill of getSkillsForPortal(portalId)) {
    for (const example of skill.examples) {
      if (out.length >= 3) return out;
      if (!out.includes(example)) out.push(example);
    }
  }
  return out;
}

export function getPrimaryVoiceExample(portalId: VoicePortalId): string | null {
  return getPortalVoiceExamples(portalId)[0] ?? null;
}

export function formatVoiceHint(portalId: VoicePortalId, fallback: string): string {
  const primary = getPrimaryVoiceExample(portalId);
  if (!primary) return fallback;
  return primary;
}
