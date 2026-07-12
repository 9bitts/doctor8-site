import type { PharmacyOrder, Prescription } from "@prisma/client";

/** Order must be paid before prescription token can be dispensed (online marketplace). */
export const PHARMACY_ORDER_PAID_STATUSES = [
  "PAID",
  "CONFIRMED",
  "PREPARING",
  "READY",
] as const;

/** Active orders block a second order for the same prescription. */
export const PHARMACY_ORDER_ACTIVE_STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "CONFIRMED",
  "PREPARING",
  "READY",
] as const;

export type PrescriptionDispenseCheck = Pick<
  Prescription,
  "signatureStatus" | "validUntil"
>;

export function assertPrescriptionDispensable(
  rx: PrescriptionDispenseCheck | null | undefined,
): string | null {
  if (!rx) return "Receita não encontrada";
  if (rx.signatureStatus !== "SIGNED") {
    return "Receita não assinada digitalmente";
  }
  if (!rx.validUntil || rx.validUntil < new Date()) {
    return "Receita expirada";
  }
  return null;
}

export function assertOrderPaidForDispense(
  order: Pick<PharmacyOrder, "status"> | null | undefined,
  hasLinkedOrder: boolean,
): string | null {
  if (!hasLinkedOrder) return null;
  if (!order) return "Pedido não encontrado";
  if (!(PHARMACY_ORDER_PAID_STATUSES as readonly string[]).includes(order.status)) {
    return "Pedido ainda não pago";
  }
  return null;
}
