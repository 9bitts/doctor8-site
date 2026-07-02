// src/lib/stripe-refund.ts
// Idempotent automatic refunds for PaymentIntents (JIT queue + appointments).
// Never throws ? callers (queue cancel, no-show expiry, webhook) must keep
// working even when the refund fails; failures are logged with
// [AUTO-REFUND-FAIL] for manual reconciliation.

import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";

export interface RefundResult {
  refunded: boolean;
  alreadyRefunded?: boolean;
  reason?: "not_charged";
  error?: boolean;
}

export async function refundPaymentIntentIdempotent(
  paymentIntentId: string,
  reason: string,
): Promise<RefundResult> {
  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });

    // Only refund money that was actually captured.
    if (intent.status !== "succeeded") {
      return { refunded: false, reason: "not_charged" };
    }

    const charge = intent.latest_charge as Stripe.Charge | null;
    if (charge && (charge.refunded || charge.amount_refunded > 0)) {
      return { refunded: true, alreadyRefunded: true };
    }

    await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        metadata: { reason, source: "auto-refund" },
      },
      // Deterministic key: retries for the same intent can never double-refund.
      { idempotencyKey: `refund-${paymentIntentId}` },
    );

    console.log(`[AUTO-REFUND] Refunded ${paymentIntentId} (${reason})`);
    return { refunded: true };
  } catch (e) {
    console.error(
      `[AUTO-REFUND-FAIL] Could not refund ${paymentIntentId} (${reason}):`,
      e,
    );
    return { refunded: false, error: true };
  }
}
