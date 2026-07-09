import type { VoicePrefillPayload } from "./types";
import {
  VOICE_FORM_PREFILL_STORAGE_KEY,
  VOICE_NOTE_STORAGE_KEY,
  VOICE_PREFILL_STORAGE_KEY,
} from "./types";

export function storeVoicePrefill(payload: Extract<VoicePrefillPayload, { type: "prescription" }>): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(VOICE_PREFILL_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function storeVoiceFormPrefill(payload: Extract<VoicePrefillPayload, { type: "form" }>): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(VOICE_FORM_PREFILL_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function peekVoicePrefill(): Extract<VoicePrefillPayload, { type: "prescription" }> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(VOICE_PREFILL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VoicePrefillPayload;
    return parsed.type === "prescription" ? parsed : null;
  } catch {
    return null;
  }
}

export function peekVoiceFormPrefill(): Extract<VoicePrefillPayload, { type: "form" }> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(VOICE_FORM_PREFILL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Extract<VoicePrefillPayload, { type: "form" }>;
  } catch {
    return null;
  }
}

export function consumeVoicePrefill(): Extract<VoicePrefillPayload, { type: "prescription" }> | null {
  const payload = peekVoicePrefill();
  if (!payload) return null;
  try {
    sessionStorage.removeItem(VOICE_PREFILL_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return payload;
}

export function consumeVoiceFormPrefill(
  formType?: string,
  chartId?: string,
): Extract<VoicePrefillPayload, { type: "form" }> | null {
  const payload = peekVoiceFormPrefill();
  if (!payload) return null;
  if (formType && payload.formType !== formType) return null;
  if (chartId && payload.patientRecordId && payload.patientRecordId !== chartId) return null;
  try {
    sessionStorage.removeItem(VOICE_FORM_PREFILL_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return payload;
}

export function storeVoiceClinicalNote(payload: {
  draft: string;
  patientRecordId?: string;
  patientName?: string;
  portalId: string;
}): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(VOICE_NOTE_STORAGE_KEY, JSON.stringify({ ...payload, createdAt: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function consumeVoiceClinicalNote(): {
  draft: string;
  patientRecordId?: string;
  patientName?: string;
  portalId: string;
  createdAt: number;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(VOICE_NOTE_STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(VOICE_NOTE_STORAGE_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
