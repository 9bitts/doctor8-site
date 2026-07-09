import type { VoicePortalId, VoiceSessionContext } from "./types";
import { VOICE_SESSION_STORAGE_KEY } from "./types";

export function saveVoiceSessionContext(ctx: Omit<VoiceSessionContext, "updatedAt">): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      VOICE_SESSION_STORAGE_KEY,
      JSON.stringify({ ...ctx, updatedAt: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

export function getVoiceSessionContext(): VoiceSessionContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(VOICE_SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as VoiceSessionContext;
  } catch {
    return null;
  }
}

export function mergePatientFromSession(
  portalId: VoicePortalId,
  patientName?: string | null,
): { patientName?: string; patientRecordId?: string } {
  if (patientName?.trim()) return { patientName: patientName.trim() };
  const session = getVoiceSessionContext();
  if (session?.portalId === portalId && session.patientRecordId) {
    return {
      patientName: session.patientName,
      patientRecordId: session.patientRecordId,
    };
  }
  return {};
}
