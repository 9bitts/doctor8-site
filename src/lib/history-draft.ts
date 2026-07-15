const PREFIX = "doctor8:history-draft:";

export type HistoryFormDraft = Record<string, unknown>;

type DraftEnvelope = {
  savedAt: number;
  data: HistoryFormDraft;
};

export function historyDraftKey(userId: string): string {
  return `${PREFIX}${userId}`;
}

export function isHistoryDraftEmpty(draft: HistoryFormDraft): boolean {
  for (const value of Object.values(draft)) {
    if (Array.isArray(value) && value.length > 0) return false;
    if (typeof value === "string" && value.trim()) return false;
  }
  return true;
}

export function saveHistoryDraft(userId: string, draft: HistoryFormDraft): void {
  if (typeof window === "undefined") return;
  try {
    if (isHistoryDraftEmpty(draft)) {
      localStorage.removeItem(historyDraftKey(userId));
      return;
    }
    const envelope: DraftEnvelope = { savedAt: Date.now(), data: draft };
    localStorage.setItem(historyDraftKey(userId), JSON.stringify(envelope));
  } catch {
    /* quota or private mode */
  }
}

export function loadHistoryDraft(userId: string): HistoryFormDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(historyDraftKey(userId));
    if (!raw) return null;
    const envelope = JSON.parse(raw) as DraftEnvelope;
    return envelope.data ?? null;
  } catch {
    return null;
  }
}

export function clearHistoryDraft(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(historyDraftKey(userId));
  } catch {
    /* ignore */
  }
}
