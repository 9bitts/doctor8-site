export type PrescriptionItemKind = "medication" | "device" | "phytotherapy" | "floral";

export function isFreeTextPrescriptionItem(
  kind: PrescriptionItemKind | undefined,
): boolean {
  return kind === "device" || kind === "phytotherapy";
}
