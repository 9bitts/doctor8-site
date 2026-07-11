import type { PrescriptionItemKind } from "@/lib/prescription-item-kind";

/** Medication line from a stored prescription, including optional MN catalog metadata. */
export type PrescriptionMedicationLine = {
  name: string;
  dosage?: string;
  presentation?: string;
  itemKind?: PrescriptionItemKind;
  mnSlug?: string;
  renisus?: boolean;
};

export function normalizePrescriptionMedicationLines(
  raw: unknown,
): PrescriptionMedicationLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is Record<string, unknown> => !!m && typeof m === "object")
    .map((m) => ({
      name: String(m.name || "").trim(),
      dosage: m.dosage ? String(m.dosage) : undefined,
      presentation: m.presentation ? String(m.presentation) : undefined,
      itemKind: m.itemKind as PrescriptionItemKind | undefined,
      mnSlug: m.mnSlug ? String(m.mnSlug) : undefined,
      renisus: m.renisus === true,
    }))
    .filter((m) => m.name.length > 0);
}

export const MN_ITEM_KIND_LABELS_PT: Partial<Record<PrescriptionItemKind, string>> = {
  phytotherapy: "Fitoterápico",
  floral: "Floral",
  homeopathy: "Homeopatia",
  aromatherapy: "Aromaterapia",
  apitherapy: "Apiterapia",
};
