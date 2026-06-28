// Confirm a consultation Checkout Session after redirect (sync payments).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import {
  fulfillConsultationPayment,
  type ConsultationPaymentMeta,
} from "@/lib/fulfill-consultation";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  const checkout = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });

  if (checkout.metadata?.kind !== "consultation") {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }
  if (checkout.metadata?.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (checkout.payment_status === "unpaid") {
    return NextResponse.json({
      status: "pending",
      message:
        "Pagamento pendente. Para PIX ou boleto, conclua o pagamento e aguarde a confirmacao.",
    });
  }

  const paymentIntent =
    typeof checkout.payment_intent === "string"
      ? await stripe.paymentIntents.retrieve(checkout.payment_intent)
      : checkout.payment_intent;

  if (!paymentIntent || paymentIntent.status !== "succeeded") {
    return NextResponse.json({
      status: "pending",
      message: "Pagamento ainda não confirmado.",
    });
  }

  const result = await fulfillConsultationPayment({
    stripePaymentId: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    metadata: checkout.metadata as ConsultationPaymentMeta,
  });

  return NextResponse.json({
    status: "confirmed",
    appointmentId: result.appointmentId,
    created: result.created,
  });
}
