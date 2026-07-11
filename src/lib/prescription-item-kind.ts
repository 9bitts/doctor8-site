export type PrescriptionItemKind =
  | "medication"
  | "device"
  | "phytotherapy"
  | "floral"
  | "homeopathy"
  | "aromatherapy"
  | "apitherapy";

const FREE_TEXT_KINDS = new Set<PrescriptionItemKind>([
  "device",
  "phytotherapy",
  "homeopathy",
  "aromatherapy",
  "apitherapy",
]);

export function isFreeTextPrescriptionItem(
  kind: PrescriptionItemKind | undefined,
): boolean {
  return kind ? FREE_TEXT_KINDS.has(kind) : false;
}

export function isNaturalMedicineItemKind(
  kind: PrescriptionItemKind | undefined,
): boolean {
  return kind
    ? ["phytotherapy", "floral", "homeopathy", "aromatherapy", "apitherapy"].includes(kind)
    : false;
}
