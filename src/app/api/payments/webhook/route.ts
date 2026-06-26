// src/app/api/payments/webhook/route.ts
// Stripe webhook handler.
// Handles:
//   payment_intent.succeeded            -> confirm appointment (backup of client-side flow)
//   payment_intent.payment_failed       -> log
//   checkout.session.completed          -> activate Club Doctor subscription
//   customer.subscription.created        -> upsert subscription record
//   customer.subscription.updated        -> sync status / period / cancel flag
//   customer.subscription.deleted        -> mark subscription cancelled
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import {
  awardSubscriptionStamp,
  redeemStampsForInvoice,
} from "@/lib/club-stamps";

async function resolveClubUserId(stripeCustomerId: string, stripeSubscriptionId?: string | null) {
  const sub = await db.subscription.findFirst({
    where: { stripeCustomerId },
    select: { userId: true },
  });
  if (sub) return sub.userId;

  if (!stripeSubscriptionId) return null;
  try {
    const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    const userId = stripeSub.metadata?.userId;
    return userId || null;
  } catch {
    return null;
  }
}

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

  // ─────────────────────────────────────────────
  // CONSULTATION PAYMENT (one-time)
  // ─────────────────────────────────────────────
  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as any;
    const { userId, professionalId, scheduledAt, type } = intent.metadata || {};

    // Only consultation payments carry professionalId/scheduledAt.
    // Subscription invoices also create payment_intents, so we skip those here.
    if (userId && professionalId && scheduledAt) {
      try {
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
    return NextResponse.json({ received: true });
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as any;
    console.error("[WEBHOOK] Payment failed:", intent.id, intent.last_payment_error?.message);
    return NextResponse.json({ received: true });
  }

  // ─────────────────────────────────────────────
  // CLUB DOCTOR SUBSCRIPTION + STAMPS
  // ─────────────────────────────────────────────

  if (event.type === "invoice.created") {
    const invoice = event.data.object as any;
    if (invoice.subscription && invoice.amount_due > 0) {
      try {
        const userId = await resolveClubUserId(
          invoice.customer as string,
          invoice.subscription as string,
        );
        if (userId) {
          await redeemStampsForInvoice(
            userId,
            invoice.customer as string,
            invoice.id,
            invoice.amount_due,
            invoice.currency || "usd",
          );
        }
      } catch (e) {
        console.error("[WEBHOOK] Stamp redemption on invoice.created:", e);
      }
    }
    return NextResponse.json({ received: true });
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as any;
    if (invoice.subscription) {
      try {
        const userId = await resolveClubUserId(
          invoice.customer as string,
          invoice.subscription as string,
        );
        if (userId) {
          await awardSubscriptionStamp(userId, invoice.id);
        }
      } catch (e) {
        console.error("[WEBHOOK] Subscription stamp on invoice.paid:", e);
      }
    }
    return NextResponse.json({ received: true });
  }

  // ─────────────────────────────────────────────
  // CLUB DOCTOR SUBSCRIPTION (checkout)
  // ─────────────────────────────────────────────

  // Fired right after the patient finishes Stripe Checkout for the subscription.
  if (event.type === "checkout.session.completed") {
    const cs = event.data.object as any;
    if (cs.mode === "subscription") {
      const userId = cs.metadata?.userId;
      const customerId = cs.customer as string;
      const subscriptionId = cs.subscription as string;
      if (userId && subscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await db.subscription.upsert({
            where: { userId },
            create: {
              userId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: sub.id,
              stripePriceId: sub.items.data[0]?.price.id ?? null,
              status: sub.status,
              currentPeriodStart: new Date((sub as any).current_period_start * 1000),
              currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            },
            update: {
              stripeCustomerId: customerId,
              stripeSubscriptionId: sub.id,
              stripePriceId: sub.items.data[0]?.price.id ?? null,
              status: sub.status,
              currentPeriodStart: new Date((sub as any).current_period_start * 1000),
              currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            },
          });
        } catch (e) {
          console.error("[WEBHOOK] Error activating subscription:", e);
        }
      }
    }
    return NextResponse.json({ received: true });
  }

  // Keep the local subscription record in sync with Stripe.
  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = event.data.object as any;
    try {
      const existing = await db.subscription.findFirst({
        where: { stripeCustomerId: sub.customer as string },
      });
      if (existing) {
        await db.subscription.update({
          where: { id: existing.id },
          data: {
            stripeSubscriptionId: sub.id,
            stripePriceId: sub.items?.data?.[0]?.price?.id ?? existing.stripePriceId,
            status: event.type === "customer.subscription.deleted" ? "cancelled" : sub.status,
            currentPeriodStart: sub.current_period_start
              ? new Date(sub.current_period_start * 1000)
              : existing.currentPeriodStart,
            currentPeriodEnd: sub.current_period_end
              ? new Date(sub.current_period_end * 1000)
              : existing.currentPeriodEnd,
            cancelAtPeriodEnd: sub.cancel_at_period_end ?? existing.cancelAtPeriodEnd,
          },
        });
      }
    } catch (e) {
      console.error("[WEBHOOK] Error syncing subscription:", e);
    }
    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}
