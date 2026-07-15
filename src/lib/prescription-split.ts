import {
  type ClassifiedMedicationItem,
  classifyMedicationItem,
  bucketToFormKind,
  unsupportedBucketMessage,
  type MedicationRegulatoryBucket,
} from "@/lib/prescription-item-classifier";
import type { PrescriptionFormKind } from "@/lib/prescription-form-kind";

export type PrescriptionSplitGroup = {
  formKind: PrescriptionFormKind;
  medications: ClassifiedMedicationItem[];
};

export type PrescriptionSplitResult =
  | {
      ok: true;
      groups: PrescriptionSplitGroup[];
      isMixed: boolean;
      unsupported: { bucket: MedicationRegulatoryBucket; itemName: string }[];
    }
  | {
      ok: false;
      error: string;
      unsupported: { bucket: MedicationRegulatoryBucket; itemName: string }[];
    };

export function splitPrescriptionMedications(
  medications: ClassifiedMedicationItem[],
  lang: "pt" | "en" | "es" = "pt",
): PrescriptionSplitResult {
  const unsupported: { bucket: MedicationRegulatoryBucket; itemName: string }[] = [];
  const buckets = new Map<PrescriptionFormKind, ClassifiedMedicationItem[]>();

  for (const med of medications) {
    const bucket = classifyMedicationItem(med);
    const formKind = bucketToFormKind(bucket);
    if (!formKind) {
      unsupported.push({ bucket, itemName: med.name });
      continue;
    }
    const list = buckets.get(formKind) || [];
    list.push(med);
    buckets.set(formKind, list);
  }

  if (unsupported.length > 0) {
    const first = unsupported[0];
    const msg =
      unsupportedBucketMessage(first.bucket, lang) ||
      (lang === "pt"
        ? `Item não suportado: ${first.itemName}`
        : `Unsupported item: ${first.itemName}`);
    return { ok: false, error: msg, unsupported };
  }

  const order: PrescriptionFormKind[] = ["NRB", "RCE", "SIMPLE"];
  const groups: PrescriptionSplitGroup[] = order
    .filter((k) => buckets.has(k))
    .map((formKind) => ({
      formKind,
      medications: buckets.get(formKind)!,
    }));

  if (groups.length === 0) {
    return {
      ok: false,
      error:
        lang === "pt"
          ? "Adicione ao menos um medicamento."
          : "Add at least one medication.",
      unsupported: [],
    };
  }

  return {
    ok: true,
    groups,
    isMixed: groups.length > 1,
    unsupported: [],
  };
}
