import { db } from "@/lib/db";
import type { PharmacyOrder } from "@prisma/client";

export type PharmacyOrderPaymentMeta = {
  type: "pharmacy_order";
  pharmacyOrderId: string;
  patientUserId: string;
  pharmacyStoreId: string;
};

export function parsePharmacyOrderMeta(
  metadata: Record<string, string> | null | undefined,
): PharmacyOrderPaymentMeta | null {
  if (!metadata || metadata.type !== "pharmacy_order") return null;
  if (!metadata.pharmacyOrderId || !metadata.patientUserId) return null;
  return {
    type: "pharmacy_order",
    pharmacyOrderId: metadata.pharmacyOrderId,
    patientUserId: metadata.patientUserId,
    pharmacyStoreId: metadata.pharmacyStoreId || "",
  };
}

export async function fulfillPharmacyOrderPayment(
  meta: PharmacyOrderPaymentMeta,
  amountReceived: number,
): Promise<PharmacyOrder> {
  const order = await db.pharmacyOrder.findUnique({
    where: { id: meta.pharmacyOrderId },
  });
  if (!order) throw new Error("Pharmacy order not found");
  if (order.patientUserId !== meta.patientUserId) {
    throw new Error("Pharmacy order patient mismatch");
  }
  if (order.status !== "PENDING_PAYMENT" && order.status !== "PAID") {
    return order;
  }
  if (amountReceived < order.totalCents) {
    throw new Error("Payment amount mismatch");
  }

  const wasPending = order.status === "PENDING_PAYMENT";

  const updated = await db.pharmacyOrder.update({
    where: { id: order.id },
    data: {
      status: "PAID",
      paidAt: new Date(),
    },
  });

  if (wasPending) {
    const { notifyPharmacyOrderPaid } = await import("@/lib/pharmacy-order-notify");
    notifyPharmacyOrderPaid(updated.id).catch((e) =>
      console.error("[PHARMACY ORDER NOTIFY]", e),
    );
  }

  return updated;
}

export async function fulfillPharmacyCheckoutSession(sessionId: string): Promise<void> {
  const { stripe } = await import("@/lib/stripe");
  const cs = await stripe.checkout.sessions.retrieve(sessionId);
  const meta = parsePharmacyOrderMeta(cs.metadata as Record<string, string>);
  if (!meta) return;
  if (cs.payment_status !== "paid" && cs.payment_status !== "no_payment_required") return;

  const amount = cs.amount_total ?? 0;
  if (typeof cs.payment_intent === "string") {
    await db.pharmacyOrder.update({
      where: { id: meta.pharmacyOrderId },
      data: { stripePaymentIntentId: cs.payment_intent },
    });
  }
  await fulfillPharmacyOrderPayment(meta, amount);
}
