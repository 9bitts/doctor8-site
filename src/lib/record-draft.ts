import type { ClinicalMetricsInput } from "@/lib/clinical-metrics";
import { hasAnyMetric } from "@/lib/clinical-metrics";
import type { ClinicalRecordKind } from "@/lib/record-kind";

const PREFIX = "doctor8:record-draft:";

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

export function recordDraftKey(userId: string, patientRecordId: string): string {
  return `${PREFIX}${userId}:${patientRecordId}`;
}

export function isRecordDraftEmpty(draft: ClinicalRecordDraft): boolean {
  return !draft.title?.trim()
    && !draft.content?.trim()
    && !draft.cidSelection
    && !(draft.metrics && hasAnyMetric(draft.metrics));
}

export function saveRecordDraft(
  userId: string,
  patientRecordId: string,
  draft: ClinicalRecordDraft,
): void {
  if (typeof window === "undefined") return;
  try {
    const envelope: DraftEnvelope = { savedAt: Date.now(), data: draft };
    localStorage.setItem(recordDraftKey(userId, patientRecordId), JSON.stringify(envelope));
  } catch {
    /* quota or private mode */
  }
}

export function loadRecordDraft(
  userId: string,
  patientRecordId: string,
): ClinicalRecordDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(recordDraftKey(userId, patientRecordId));
    if (!raw) return null;
    const envelope = JSON.parse(raw) as DraftEnvelope;
    return envelope.data ?? null;
  } catch {
    return null;
  }
}

export function clearRecordDraft(userId: string, patientRecordId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(recordDraftKey(userId, patientRecordId));
  } catch {
    /* ignore */
  }
}

export function hasRecordDraft(userId: string, patientRecordId: string): boolean {
  const draft = loadRecordDraft(userId, patientRecordId);
  return draft !== null && !isRecordDraftEmpty(draft);
}
