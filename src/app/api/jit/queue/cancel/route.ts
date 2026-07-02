import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { refundPaymentIntentIdempotent, type RefundResult } from "@/lib/stripe-refund";

const schema = z.object({ queueId: z.string() });

async function refundJitQueuePayment(
  paymentId: string | null | undefined,
  reason: string,
): Promise<RefundResult> {
  if (!paymentId) return { refunded: false };
  const payment = await db.jitPayment.findUnique({
    where: { id: paymentId },
    select: { id: true, stripePaymentId: true },
  });
  if (!payment?.stripePaymentId) {
    console.error(`[AUTO-REFUND-FAIL] JitPayment ${paymentId} has no stripePaymentId`);
    return { refunded: false, error: true };
  }
  const result = await refundPaymentIntentIdempotent(payment.stripePaymentId, reason);
  if (result.refunded) {
    await db.jitPayment
      .update({ where: { id: payment.id }, data: { status: "refunded" } })
      .catch(() => {});
  }
  return result;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const entry = await db.jitQueue.findUnique({
    where: { id: parsed.data.queueId },
    select: { id: true, patientUserId: true, status: true, paymentId: true },
  });

  if (!entry || entry.patientUserId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!["WAITING", "CALLED"].includes(entry.status)) {
    return NextResponse.json({ error: "Cannot cancel" }, { status: 400 });
  }

  await db.jitQueue.update({
    where: { id: entry.id },
    data: { status: "CANCELLED", endedAt: new Date() },
  });

  // Auto-refund paid entries via JitPayment → Stripe PaymentIntent.
  // Refund failure never blocks the cancellation itself.
  let refunded = false;
  if (entry.paymentId) {
    const result = await refundJitQueuePayment(entry.paymentId, "jit_cancelled_by_patient");
    refunded = result.refunded;
  }

  return NextResponse.json({ success: true, refunded });
}
