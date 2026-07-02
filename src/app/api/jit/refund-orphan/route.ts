// src/app/api/jit/refund-orphan/route.ts
// Recovers orphaned JIT payments: the patient paid (confirmCardPayment
// succeeded) but the subsequent queue join failed (queue full, session
// offline, network error). Refunds the PaymentIntent after verifying
// ownership, JIT type, and that no queue entry ever used this payment.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { refundPaymentIntentIdempotent } from "@/lib/stripe-refund";
import { z } from "zod";

const schema = z.object({ paymentIntentId: z.string() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { paymentIntentId } = parsed.data;

  let intent;
  try {
    intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  // a. Ownership: the intent must record its owner and match the session user.
  if (!intent.metadata?.userId || intent.metadata.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // b. Only JIT payments can be recovered through this route.
  if (intent.metadata?.type !== "JIT") {
    return NextResponse.json({ error: "Not a JIT payment" }, { status: 403 });
  }

  // c. Orphan check: if a JitPayment for this intent is linked to an active
  // queue entry, the join succeeded — nothing to recover.
  const existingPayment = await db.jitPayment.findUnique({
    where: { stripePaymentId: paymentIntentId },
    include: { queueEntry: { select: { id: true, status: true } } },
  });
  if (existingPayment?.queueEntry) {
    const activeStatuses = ["WAITING", "CALLED", "IN_PROGRESS", "DONE"];
    if (activeStatuses.includes(existingPayment.queueEntry.status)) {
      return NextResponse.json({ error: "Payment is not orphaned" }, { status: 409 });
    }
  }

  const result = await refundPaymentIntentIdempotent(paymentIntentId, "jit_join_failed");
  return NextResponse.json(result);
}
