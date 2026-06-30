import type { ClinicalMetricsInput } from "@/lib/clinical-metrics";
import { hasAnyMetric } from "@/lib/clinical-metrics";
import type { ClinicalRecordKind } from "@/lib/record-kind";

const PREFIX = "doctor8:recordDraft:";

export type ClinicalRecordDraft = {
  categoryId?: string;
  cidSelection?: { code: string; description: string } | null;
  title?: string;
  content?: string;
  recordKind?: ClinicalRecordKind;
  metrics?: ClinicalMetricsInput;
  addToDiagnoses?: boolean;
};

type DraftEnvelope = {
  savedAt: number;
  data: ClinicalRecordDraft;
};

export function recordDraftKey(patientRecordId: string): string {
  return `${PREFIX}${patientRecordId}`;
}

export function isRecordDraftEmpty(draft: ClinicalRecordDraft): boolean {
  return !draft.title?.trim()
    && !draft.content?.trim()
    && !draft.cidSelection
    && !(draft.metrics && hasAnyMetric(draft.metrics));
}

export function saveRecordDraft(patientRecordId: string, draft: ClinicalRecordDraft): void {
  if (typeof window === "undefined") return;
  try {
    const envelope: DraftEnvelope = { savedAt: Date.now(), data: draft };
    localStorage.setItem(recordDraftKey(patientRecordId), JSON.stringify(envelope));
  } catch {
    /* quota or private mode */
  }
}

export function loadRecordDraft(patientRecordId: string): ClinicalRecordDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(recordDraftKey(patientRecordId));
    if (!raw) return null;
    const envelope = JSON.parse(raw) as DraftEnvelope;
    return envelope.data ?? null;
  } catch {
    return null;
  }
}

export function clearRecordDraft(patientRecordId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(recordDraftKey(patientRecordId));
  } catch {
    /* ignore */
  }
}

export function hasRecordDraft(patientRecordId: string): boolean {
  const draft = loadRecordDraft(patientRecordId);
  return draft !== null && !isRecordDraftEmpty(draft);
}
