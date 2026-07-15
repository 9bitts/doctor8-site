import type { ImportOrder } from "@prisma/client";
import { db } from "@/lib/db";
import { recordImportOrderEvent } from "@/lib/import-order";

export type ImportOrderPaymentMeta = {
  type: "import_order";
  importOrderId: string;
  patientUserId: string;
};

export function parseImportOrderMeta(
  metadata: Record<string, string> | null | undefined,
): ImportOrderPaymentMeta | null {
  if (!metadata || metadata.type !== "import_order") return null;
  if (!metadata.importOrderId || !metadata.patientUserId) return null;
  return {
    type: "import_order",
    importOrderId: metadata.importOrderId,
    patientUserId: metadata.patientUserId,
  };
}

export async function fulfillImportOrderPayment(
  meta: ImportOrderPaymentMeta,
  amountReceived: number,
  opts?: { stripePaymentIntentId?: string | null; stripeCheckoutSessionId?: string | null },
): Promise<ImportOrder> {
  const order = await db.importOrder.findUnique({
    where: { id: meta.importOrderId },
  });
  if (!order) throw new Error("Import order not found");
  if (order.patientUserId !== meta.patientUserId) {
    throw new Error("Import order patient mismatch");
  }
  if (order.status !== "PAYMENT_PENDING" && order.status !== "PAID") {
    return order;
  }
  if (amountReceived < order.feeBrlCents) {
    throw new Error("Payment amount mismatch");
  }

  const wasPending = order.status === "PAYMENT_PENDING";
  const updated = await db.importOrder.update({
    where: { id: order.id },
    data: {
      status: "PAID",
      paidAt: order.paidAt ?? new Date(),
      ...(opts?.stripePaymentIntentId
        ? { stripePaymentIntentId: opts.stripePaymentIntentId }
        : {}),
      ...(opts?.stripeCheckoutSessionId
        ? { stripeCheckoutSessionId: opts.stripeCheckoutSessionId }
        : {}),
    },
  });

  if (wasPending) {
    await recordImportOrderEvent({
      orderId: order.id,
      fromStatus: "PAYMENT_PENDING",
      toStatus: "PAID",
      note: "stripe_fee_paid",
    });
    const { notifyImportOrderTransition } = await import("@/lib/import-order-notify");
    notifyImportOrderTransition(updated.id, "PAYMENT_PENDING", "PAID").catch((e) =>
      console.error("[IMPORT ORDER NOTIFY]", e),
    );
  }

  return updated;
}

export async function fulfillImportCheckoutSession(sessionId: string): Promise<void> {
  const { stripe } = await import("@/lib/stripe");
  const cs = await stripe.checkout.sessions.retrieve(sessionId);
  const meta = parseImportOrderMeta(cs.metadata as Record<string, string>);
  if (!meta) return;
  if (cs.payment_status !== "paid" && cs.payment_status !== "no_payment_required") return;

  const amount = cs.amount_total ?? 0;
  const pi =
    typeof cs.payment_intent === "string" ? cs.payment_intent : cs.payment_intent?.id ?? null;

  await fulfillImportOrderPayment(meta, amount, {
    stripePaymentIntentId: pi,
    stripeCheckoutSessionId: sessionId,
  });
}
