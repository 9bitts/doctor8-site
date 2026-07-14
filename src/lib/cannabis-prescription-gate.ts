import type { PrescriptionItemKind } from "@/lib/prescription-item-kind";
import { canPrescribeCannabisMedicinal } from "@/lib/profession-label";

export type CannabisMedicationInput = {
  itemKind?: PrescriptionItemKind | string;
  mnSlug?: string;
};

/** Rejeita prescrições com item cannabis se a profissão não for médico ou dentista. */
export function assertCannabisPrescriptionAllowed(
  specialty: string | null | undefined,
  medications: CannabisMedicationInput[],
): { ok: true } | { ok: false; message: string } {
  const hasCannabis = medications.some((m) => m.itemKind === "cannabis");
  if (!hasCannabis) return { ok: true };
  if (canPrescribeCannabisMedicinal(specialty)) return { ok: true };
  return {
    ok: false,
    message: "Cannabis medicinal prescription is restricted to physicians and dentists (RDC 1.015/2026).",
  };
}
