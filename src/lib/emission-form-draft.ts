import type { PrescriptionDraftPatient } from "@/lib/prescription-draft";

export type EmissionDraftPatient = PrescriptionDraftPatient;

type DraftEnvelope<T> = {
  savedAt: number;
  data: T;
};

const EXAM_PREFIX = "doctor8:exam-draft:";
const DOCUMENT_PREFIX = "doctor8:document-draft:";

export type ExamFormDraft = {
  selectedPatient: EmissionDraftPatient | null;
  title: string;
  items: string[];
  notes: string;
  cidCode: string;
  cidDescription: string;
  editingDocumentId: string | null;
  lockPatient: boolean;
};

export type DocumentFormDraft = {
  selectedPatient: EmissionDraftPatient | null;
  categoryId: string;
  body: string;
  /** Legacy document type used to resolve category when categoryId is empty */
  initialType: string;
  editingDocumentId: string | null;
  lockPatient: boolean;
};

function scopedKey(prefix: string, userId: string, portal: string): string {
  return `${prefix}${userId}:${portal}`;
}

function saveDraft<T>(
  key: string,
  draft: T,
  isEmpty: (d: T) => boolean,
): void {
  if (typeof window === "undefined") return;
  try {
    if (isEmpty(draft)) {
      localStorage.removeItem(key);
      return;
    }
    const envelope: DraftEnvelope<T> = { savedAt: Date.now(), data: draft };
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    /* quota or private mode */
  }
}

function loadDraft<T>(key: string, validate: (d: unknown) => d is T): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as DraftEnvelope<T>;
    if (!validate(envelope?.data)) return null;
    return envelope.data;
  } catch {
    return null;
  }
}

function clearDraft(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function examDraftKey(userId: string, portal: string): string {
  return scopedKey(EXAM_PREFIX, userId, portal);
}

export function documentDraftKey(userId: string, portal: string): string {
  return scopedKey(DOCUMENT_PREFIX, userId, portal);
}

export function isExamDraftEmpty(draft: ExamFormDraft): boolean {
  const hasItems = draft.items.some((i) => i.trim());
  return (
    !hasItems &&
    !draft.notes?.trim() &&
    !draft.cidCode?.trim() &&
    !draft.selectedPatient &&
    !draft.editingDocumentId
  );
}

export function isDocumentDraftEmpty(draft: DocumentFormDraft): boolean {
  return (
    !draft.body?.trim() &&
    !draft.categoryId?.trim() &&
    !draft.selectedPatient &&
    !draft.editingDocumentId
  );
}

export function saveExamDraft(
  userId: string,
  portal: string,
  draft: ExamFormDraft,
): void {
  saveDraft(examDraftKey(userId, portal), draft, isExamDraftEmpty);
}

export function loadExamDraft(
  userId: string,
  portal: string,
): ExamFormDraft | null {
  return loadDraft(examDraftKey(userId, portal), (d): d is ExamFormDraft => {
    if (!d || typeof d !== "object") return false;
    const o = d as ExamFormDraft;
    return Array.isArray(o.items) && typeof o.title === "string";
  });
}

export function clearExamDraft(userId: string, portal: string): void {
  clearDraft(examDraftKey(userId, portal));
}

export function hasExamDraft(userId: string, portal: string): boolean {
  const draft = loadExamDraft(userId, portal);
  return draft !== null && !isExamDraftEmpty(draft);
}

export function saveDocumentDraft(
  userId: string,
  portal: string,
  draft: DocumentFormDraft,
): void {
  saveDraft(documentDraftKey(userId, portal), draft, isDocumentDraftEmpty);
}

export function loadDocumentDraft(
  userId: string,
  portal: string,
): DocumentFormDraft | null {
  return loadDraft(
    documentDraftKey(userId, portal),
    (d): d is DocumentFormDraft => {
      if (!d || typeof d !== "object") return false;
      const o = d as DocumentFormDraft;
      return typeof o.body === "string";
    },
  );
}

export function clearDocumentDraft(userId: string, portal: string): void {
  clearDraft(documentDraftKey(userId, portal));
}

export function hasDocumentDraft(userId: string, portal: string): boolean {
  const draft = loadDocumentDraft(userId, portal);
  return draft !== null && !isDocumentDraftEmpty(draft);
}
