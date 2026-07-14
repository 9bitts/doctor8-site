import type { PrescriptionItemKind } from "@/lib/prescription-item-kind";

const INTEGRATIVE_KINDS = new Set<PrescriptionItemKind>([
  "phytotherapy",
  "floral",
  "homeopathy",
  "aromatherapy",
  "apitherapy",
  "cannabis",
]);

export function isIntegrativeItemKind(kind: string | undefined | null): boolean {
  return INTEGRATIVE_KINDS.has((kind || "") as PrescriptionItemKind);
}

export function medicationListHasIntegrativeItems(
  medications: unknown,
): boolean {
  if (!Array.isArray(medications)) return false;
  return medications.some((m) => {
    if (!m || typeof m !== "object") return false;
    const kind = (m as { itemKind?: string }).itemKind;
    return isIntegrativeItemKind(kind);
  });
}

export function medicationListHasCannabis(medications: unknown): boolean {
  if (!Array.isArray(medications)) return false;
  return medications.some(
    (m) => m && typeof m === "object" && (m as { itemKind?: string }).itemKind === "cannabis",
  );
}

export function medicationListHasConventionalDrugs(
  medications: unknown,
): boolean {
  if (!Array.isArray(medications)) return false;
  return medications.some((m) => {
    if (!m || typeof m !== "object") return false;
    const kind = (m as { itemKind?: string }).itemKind || "medication";
    return kind === "medication" || kind === "device";
  });
}
