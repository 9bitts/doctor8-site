// src/app/api/payments/webhook/route.ts
// Stripe webhook handler
// Handles: payment_intent.succeeded → confirm appointment
//          payment_intent.payment_failed → notify patient

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("[WEBHOOK] Invalid signature:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as any;
    const { userId, professionalId, scheduledAt, type } = intent.metadata;

    if (!userId || !professionalId || !scheduledAt) {
      return NextResponse.json({ received: true });
    }

    try {
      // Check if appointment already created (idempotency)
      const existing = await db.appointment.findFirst({
        where: { stripePaymentId: intent.id },
      });

      if (!existing) {
        const patient = await db.patientProfile.findUnique({ where: { userId } });
        if (patient) {
          await db.appointment.create({
            data: {
              patientId: patient.id,
              professionalId,
              scheduledAt: new Date(scheduledAt),
              type: type || "TELECONSULT",
              status: "CONFIRMED",
              priceAmount: intent.amount,
              currency: intent.currency,
              stripePaymentId: intent.id,
              paidAt: new Date(),
              durationMins: 30,
            },
          });
        }
      }
    } catch (e) {
      console.error("[WEBHOOK] Error creating appointment:", e);
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as any;
    console.error("[WEBHOOK] Payment failed:", intent.id, intent.last_payment_error?.message);
  }

  return NextResponse.json({ received: true });
}
