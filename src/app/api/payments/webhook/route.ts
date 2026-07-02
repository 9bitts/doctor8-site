// src/app/api/payments/webhook/route.ts
// Stripe webhook handler.
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import {
  awardSubscriptionStamp,
  redeemStampsForInvoice,
} from "@/lib/club-stamps";
import {
  fulfillConsultationPayment,
  AppointmentSlotTakenError,
  type ConsultationPaymentMeta,
} from "@/lib/fulfill-consultation";
import { refundPaymentIntentIdempotent } from "@/lib/stripe-refund";
import { isClubPriceId } from "@/lib/stripe-payment-methods";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";

async function notifyClubPaymentIssue(
  userId: string,
  bodyKey: "notif.clubPayment.failed" | "notif.clubPayment.actionRequired",
) {
  const copy = storedNotificationText("notif.clubPayment.title", bodyKey);
  await createNotification({
    userId,
    title: copy.title,
    body: copy.body,
    type: "payment",
    data: {
      url: "/patient/club",
      link: "/patient/club",
      titleKey: "notif.clubPayment.title",
      bodyKey,
    },
  }).catch(() => {});
}

async function updateClubSubscriptionStatus(
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  status: string,
): Promise<string | null> {
  const existing = await db.subscription.findFirst({
    where: { stripeCustomerId },
    select: { id: true, userId: true },
  });
  if (!existing) return null;
  await db.subscription.update({
    where: { id: existing.id },
    data: {
      status,
      stripeSubscriptionId,
    },
  });
  return existing.userId;
}

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

async function isClubSubscription(stripeSubscriptionId: string): Promise<boolean> {
  try {
    const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    if (stripeSub.metadata?.planKind === "professional") return false;
    if (stripeSub.metadata?.planKind === "club") return true;
    const priceId = stripeSub.items.data[0]?.price?.id;
    return isClubPriceId(priceId);
  } catch {
    return true;
  }
}

async function fulfillConsultationCheckoutSession(sessionId: string) {
  const checkout = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });
  if (checkout.metadata?.kind !== "consultation") return;

  const paymentIntent =
    typeof checkout.payment_intent === "string"
      ? await stripe.paymentIntents.retrieve(checkout.payment_intent)
      : checkout.payment_intent;

  if (!paymentIntent || paymentIntent.status !== "succeeded") return;

  await fulfillConsultationPayment({
    stripePaymentId: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    metadata: checkout.metadata as ConsultationPaymentMeta,
  });
}

// Slot taken after a hosted-checkout payment (boleto/Pix/card) was captured —
// refund the session's PaymentIntent idempotently. Never throws.
async function refundCheckoutSlotTaken(cs: any) {
  const paymentIntentId =
    typeof cs.payment_intent === "string" ? cs.payment_intent : cs.payment_intent?.id;
  if (!paymentIntentId) {
    console.error(`[AUTO-REFUND-FAIL] checkout session sem payment_intent: ${cs.id}`);
    return;
  }
  const refund = await refundPaymentIntentIdempotent(
    paymentIntentId,
    "appointment_slot_taken_checkout",
  );
  console.error(
    `[WEBHOOK] Slot taken for checkout ${cs.id} (${paymentIntentId}) — auto-refund result:`,
    refund,
  );
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
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err: any) {
    console.error("[WEBHOOK] Invalid signature:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as any;
    const meta = intent.metadata || {};
    if (meta.type === "JIT") {
      // JIT payments are fulfilled by the queue flow, not here. Log for
      // traceability/reconciliation instead of ignoring silently.
      console.log(
        `[WEBHOOK] JIT payment succeeded: ${intent.id} (user ${meta.userId || "?"}, session ${meta.sessionId || "?"}) — handled by JIT queue flow, skipping fulfillment.`,
      );
    } else if (meta.kind === "consultation" || (meta.userId && meta.scheduledAt && (meta.professionalId || meta.psychoanalystId))) {
      try {
        await fulfillConsultationPayment({
          stripePaymentId: intent.id,
          amount: intent.amount,
          currency: intent.currency,
          metadata: meta as ConsultationPaymentMeta,
        });
      } catch (e) {
        console.error("[WEBHOOK] Error creating appointment:", e);
        if (e instanceof AppointmentSlotTakenError) {
          // Payment captured but the slot was taken — refund automatically.
          // Still return 200 to Stripe so it doesn't retry forever.
          const refund = await refundPaymentIntentIdempotent(
            intent.id,
            "appointment_slot_taken",
          );
          console.error(
            `[WEBHOOK] Slot taken for ${intent.id} — auto-refund result:`,
            refund,
          );
        }
      }
    }
    return NextResponse.json({ received: true });
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as any;
    console.error("[WEBHOOK] Payment failed:", intent.id, intent.last_payment_error?.message);
    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.async_payment_succeeded") {
    const cs = event.data.object as any;
    if (cs.mode === "payment" && cs.metadata?.kind === "consultation") {
      try {
        await fulfillConsultationCheckoutSession(cs.id);
      } catch (e) {
        console.error("[WEBHOOK] async_payment_succeeded consultation:", e);
        // Event only fires after capture, so a refund is safe here.
        if (e instanceof AppointmentSlotTakenError) await refundCheckoutSlotTaken(cs);
      }
    }
    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const cs = event.data.object as any;
    console.error("[WEBHOOK] async payment failed for checkout:", cs.id);
    return NextResponse.json({ received: true });
  }

  if (event.type === "invoice.created") {
    const invoice = event.data.object as any;
    if (invoice.subscription && invoice.amount_due > 0) {
      try {
        const club = await isClubSubscription(invoice.subscription as string);
        if (!club) return NextResponse.json({ received: true });

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
        const club = await isClubSubscription(invoice.subscription as string);
        if (!club) return NextResponse.json({ received: true });

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

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as { customer?: string; subscription?: string };
    if (invoice.subscription && invoice.customer) {
      try {
        const club = await isClubSubscription(invoice.subscription as string);
        if (club) {
          const userId = await updateClubSubscriptionStatus(
            invoice.customer as string,
            invoice.subscription as string,
            "past_due",
          );
          if (userId) await notifyClubPaymentIssue(userId, "notif.clubPayment.failed");
        }
      } catch (e) {
        console.error("[WEBHOOK] invoice.payment_failed:", e);
      }
    }
    return NextResponse.json({ received: true });
  }

  if (event.type === "invoice.payment_action_required") {
    const invoice = event.data.object as { customer?: string; subscription?: string };
    if (invoice.subscription && invoice.customer) {
      try {
        const club = await isClubSubscription(invoice.subscription as string);
        if (club) {
          const userId = await updateClubSubscriptionStatus(
            invoice.customer as string,
            invoice.subscription as string,
            "past_due",
          );
          if (userId) await notifyClubPaymentIssue(userId, "notif.clubPayment.actionRequired");
        }
      } catch (e) {
        console.error("[WEBHOOK] invoice.payment_action_required:", e);
      }
    }
    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.completed") {
    const cs = event.data.object as any;
    if (cs.mode === "payment" && cs.metadata?.kind === "consultation" && cs.payment_status === "paid") {
      try {
        await fulfillConsultationCheckoutSession(cs.id);
      } catch (e) {
        console.error("[WEBHOOK] checkout consultation:", e);
        // Guard above already requires payment_status === "paid" (unpaid
        // boleto is handled later by async_payment_succeeded).
        if (e instanceof AppointmentSlotTakenError) await refundCheckoutSlotTaken(cs);
      }
    }

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
