// src/lib/stripe-refund.ts
// Idempotent automatic refunds for PaymentIntents (JIT queue + appointments).
// Never throws — callers (queue cancel, no-show expiry, webhook) must keep
// working even when the refund fails; failures are logged with
// [AUTO-REFUND-FAIL] for manual reconciliation.

import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import {
  cancelConsultationProfessionalPayoutByPaymentIntent,
  isConsultationPayoutTransferred,
} from "@/lib/consultation-professional-payout";

const MAX_REASON_LEN = 500;

export interface RefundResult {
  refunded: boolean;
  alreadyRefunded?: boolean;
  reason?: "not_charged";
  error?: boolean;
}

export type RefundContext = {
  triggeredBy?: string;
  appointmentId?: string;
  pharmacyOrderId?: string;
  userId?: string;
};

function truncateReason(reason: string): string {
  return reason.slice(0, MAX_REASON_LEN);
}

async function writeRefundAudit(params: {
  paymentIntentId: string;
  reason: string;
  status: "SUCCEEDED" | "ALREADY_REFUNDED" | "FAILED";
  stripeRefundId?: string | null;
  amountCents?: number | null;
  currency?: string | null;
  context?: RefundContext;
}): Promise<void> {
  try {
    await db.paymentRefund.create({
      data: {
        paymentIntentId: params.paymentIntentId,
        stripeRefundId: params.stripeRefundId ?? null,
        reason: truncateReason(params.reason),
        amountCents: params.amountCents ?? null,
        currency: params.currency ?? null,
        status: params.status,
        triggeredBy: params.context?.triggeredBy ?? "OTHER",
        appointmentId: params.context?.appointmentId ?? null,
        pharmacyOrderId: params.context?.pharmacyOrderId ?? null,
        userId: params.context?.userId ?? null,
      },
    });
  } catch (e) {
    console.error("[REFUND-AUDIT-WRITE-FAIL]", params.paymentIntentId, e);
  }
}

export async function refundPaymentIntentIdempotent(
  paymentIntentId: string,
  reason: string,
  context?: RefundContext,
): Promise<RefundResult> {
  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });

    // Only refund money that was actually captured.
    if (intent.status !== "succeeded") {
      await writeRefundAudit({
        paymentIntentId,
        reason: truncateReason(`not_charged: ${reason}`),
        status: "FAILED",
        context,
      });
      return { refunded: false, reason: "not_charged" };
    }

    const charge = intent.latest_charge as Stripe.Charge | null;
    if (charge && (charge.refunded || charge.amount_refunded > 0)) {
      await writeRefundAudit({
        paymentIntentId,
        reason,
        status: "ALREADY_REFUNDED",
        amountCents: charge.amount_refunded > 0 ? charge.amount_refunded : charge.amount,
        currency: charge.currency ?? intent.currency ?? null,
        context,
      });
      return { refunded: true, alreadyRefunded: true };
    }

    const hasConnectTransfer = await isConsultationPayoutTransferred(paymentIntentId);
    if (!hasConnectTransfer) {
      await cancelConsultationProfessionalPayoutByPaymentIntent(paymentIntentId);
    }

    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        ...(hasConnectTransfer
          ? { reverse_transfer: true, refund_application_fee: false }
          : {}),
        metadata: { reason, source: "auto-refund" },
      },
      { idempotencyKey: `refund-${paymentIntentId}` },
    );

    await writeRefundAudit({
      paymentIntentId,
      reason,
      status: "SUCCEEDED",
      stripeRefundId: refund.id,
      amountCents: refund.amount,
      currency: refund.currency,
      context,
    });

    console.log(`[AUTO-REFUND] Refunded ${paymentIntentId} (${reason})`);
    return { refunded: true };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error(
      `[AUTO-REFUND-FAIL] Could not refund ${paymentIntentId} (${reason}):`,
      e,
    );
    await writeRefundAudit({
      paymentIntentId,
      reason: truncateReason(`${reason}: ${errMsg}`),
      status: "FAILED",
      context,
    });
    return { refunded: false, error: true };
  }
}
