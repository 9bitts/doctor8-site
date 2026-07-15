import {
  assertPrescriptionDispensable,
  type PrescriptionDispenseCheck,
} from "@/lib/pharmacy-network/dispense-guards";
import { requiresSncrNumber } from "@/lib/prescription-form-kind";
import type { PrescriptionFormKind } from "@/lib/prescription-form-kind";

export type PrescriptionDispenseSignatureCheck = PrescriptionDispenseCheck & {
  signedFileUrl?: string | null;
  prescriptionFormKind?: string | null;
  sncrReceiptNumber?: string | null;
};

/** Validates signature + controlled fields before pharmacy dispense (ITI-ready). */
export function assertPrescriptionReadyForPharmacyDispense(
  rx: PrescriptionDispenseSignatureCheck | null | undefined,
): string | null {
  const basic = assertPrescriptionDispensable(rx);
  if (basic) return basic;

  if (!rx!.signedFileUrl) {
    return "PDF assinado indisponível — validação ITI não possível";
  }

  const formKind = (rx!.prescriptionFormKind || "SIMPLE") as PrescriptionFormKind;
  if (requiresSncrNumber(formKind) && !rx!.sncrReceiptNumber?.trim()) {
    return "Receita controlada sem numeração SNCR";
  }

  return null;
}
