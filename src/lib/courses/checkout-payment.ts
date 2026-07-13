import type Stripe from "stripe";

export function buildCourseApplicationFeeCents(
  finalAmountCents: number,
  commissionPercent: number,
): number {
  return Math.round((finalAmountCents * commissionPercent) / 100);
}

export function buildCourseCheckoutPaymentIntentData(
  finalAmountCents: number,
  commissionPercent: number,
  instructorAccountId: string,
): Stripe.Checkout.SessionCreateParams.PaymentIntentData {
  return {
    application_fee_amount: buildCourseApplicationFeeCents(finalAmountCents, commissionPercent),
    transfer_data: { destination: instructorAccountId },
  };
}

export function shouldBlockCoursePublishForConnect(
  connectEnabled: boolean,
  priceCents: number,
  connectStatus: string,
): boolean {
  return connectEnabled && priceCents > 0 && connectStatus !== "active";
}
