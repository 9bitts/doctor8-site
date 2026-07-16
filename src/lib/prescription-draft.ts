import type { PrescriptionMedItem } from "@/components/professional/prescriptions/PrescriptionMedItemForm";
import type { ControlledFormKind } from "@/lib/prescription-form-kind";
import type { PrescriptionItemSearchMode } from "@/lib/medicina-natural-catalog/prescription-search";
import type { DrugCountryCode } from "@/lib/drug-countries";

const PREFIX = "doctor8:prescription-draft:";

export type PrescriptionDraftPatient = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  hasAccount: boolean;
};

export type PrescriptionDraftPlatformTarget = {
  patientUserId: string;
  patientProfileId: string;
  displayName: string;
  linkStatus: "NONE" | "PENDING" | "ACCEPTED" | "REJECTED" | "REVOKED";
};

export type PrescriptionFormDraft = {
  medications: PrescriptionMedItem[];
  instructions: string;
  validDays: number;
  controlledFormKind: ControlledFormKind;
  freeTextMode: boolean;
  itemSearchMode: PrescriptionItemSearchMode;
  floralOnlyMode: boolean;
  bulkPasteText: string;
  showBulkPaste: boolean;
  drugCountry: DrugCountryCode;
  selectedPatient: PrescriptionDraftPatient | null;
  platformTarget: PrescriptionDraftPlatformTarget | null;
  editingPrescriptionId: string | null;
  lockPatient: boolean;
  consultReturnUrl: string | null;
};

type DraftEnvelope = {
  savedAt: number;
  data: PrescriptionFormDraft;
};

export function prescriptionDraftKey(userId: string, portal: string): string {
  return `${PREFIX}${userId}:${portal}`;
}

export function isPrescriptionDraftEmpty(draft: PrescriptionFormDraft): boolean {
  const hasMed = draft.medications.some(
    (m) =>
      m.name?.trim() ||
      m.dosage?.trim() ||
      m.frequency?.trim() ||
      m.duration?.trim() ||
      m.instructions?.trim() ||
      m.mnSlug?.trim() ||
      m.floralProductId?.trim() ||
      m.phytoProductId?.trim(),
  );
  return (
    !hasMed &&
    !draft.instructions?.trim() &&
    !draft.bulkPasteText?.trim() &&
    !draft.selectedPatient &&
    !draft.platformTarget &&
    !draft.editingPrescriptionId
  );
}

export function savePrescriptionDraft(
  userId: string,
  portal: string,
  draft: PrescriptionFormDraft,
): void {
  if (typeof window === "undefined") return;
  try {
    const key = prescriptionDraftKey(userId, portal);
    if (isPrescriptionDraftEmpty(draft)) {
      localStorage.removeItem(key);
      return;
    }
    const envelope: DraftEnvelope = { savedAt: Date.now(), data: draft };
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    /* quota or private mode */
  }
}

export function loadPrescriptionDraft(
  userId: string,
  portal: string,
): PrescriptionFormDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(prescriptionDraftKey(userId, portal));
    if (!raw) return null;
    const envelope = JSON.parse(raw) as DraftEnvelope;
    if (!envelope?.data || !Array.isArray(envelope.data.medications)) return null;
    return envelope.data;
  } catch {
    return null;
  }
}

export function clearPrescriptionDraft(userId: string, portal: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(prescriptionDraftKey(userId, portal));
  } catch {
    /* ignore */
  }
}

export function hasPrescriptionDraft(userId: string, portal: string): boolean {
  const draft = loadPrescriptionDraft(userId, portal);
  return draft !== null && !isPrescriptionDraftEmpty(draft);
}

export function loadPrescriptionDraftMeta(
  userId: string,
  portal: string,
): { savedAt: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(prescriptionDraftKey(userId, portal));
    if (!raw) return null;
    const envelope = JSON.parse(raw) as DraftEnvelope;
    if (!envelope?.data || isPrescriptionDraftEmpty(envelope.data)) return null;
    return { savedAt: envelope.savedAt };
  } catch {
    return null;
  }
}
