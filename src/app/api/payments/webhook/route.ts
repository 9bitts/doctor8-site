// src/app/api/payments/webhook/route.ts
// Stripe webhook handler.
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
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
import {
  fulfillCoursePurchase,
  type CoursePaymentMeta,
} from "@/lib/fulfill-course-purchase";
import { refundPaymentIntentIdempotent } from "@/lib/stripe-refund";
import { isClubPriceId } from "@/lib/stripe-payment-methods";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import {
  isStripeConnectEnabled,
  logConnectAccountUpdated,
} from "@/lib/stripe-connect";

const MAX_EVENT_ERROR_LEN = 500;

/** Return HTTP 200 without marking PROCESSED — FAILED already recorded when applicable. */
class WebhookReturn200 extends Error {
  constructor() {
    super("Webhook handled with 200");
    this.name = "WebhookReturn200";
  }
}

function truncateError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.slice(0, MAX_EVENT_ERROR_LEN);
}

function isPermanentFulfillmentError(e: unknown): boolean {
  if (e instanceof AppointmentSlotTakenError) return false;
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg === "Missing consultation payment metadata" ||
    msg === "Patient not found" ||
    msg === "Provider not found" ||
    msg === "Payment amount mismatch"
  );
}

function isTransientError(e: unknown): boolean {
  if (e instanceof WebhookReturn200) return false;
  if (e instanceof AppointmentSlotTakenError) return false;
  if (isPermanentFulfillmentError(e)) return false;
  return true;
}

async function markEventProcessed(eventId: string, type: string): Promise<void> {
  try {
    await db.processedStripeEvent.upsert({
      where: { eventId },
      create: { eventId, type, status: "PROCESSED" },
      update: { type, status: "PROCESSED", error: null, processedAt: new Date() },
    });
  } catch (e) {
    console.error("[WEBHOOK-DEDUP-WRITE-FAIL]", eventId, e);
  }
}

async function markEventFailed(eventId: string, type: string, error: string): Promise<void> {
  try {
    const err = error.slice(0, MAX_EVENT_ERROR_LEN);
    await db.processedStripeEvent.upsert({
      where: { eventId },
      create: { eventId, type, status: "FAILED", error: err },
      update: { type, status: "FAILED", error: err, processedAt: new Date() },
    });
  } catch (e) {
    console.error("[WEBHOOK-DEDUP-WRITE-FAIL]", eventId, e);
  }
}

async function handleConsultationFulfillmentError(
  e: unknown,
  paymentIntentId: string,
  event: Stripe.Event,
): Promise<void> {
  if (e instanceof AppointmentSlotTakenError) {
    const refund = await refundPaymentIntentIdempotent(
      paymentIntentId,
      "appointment_slot_taken",
    );
    console.error(
      `[WEBHOOK] Slot taken for ${paymentIntentId} — auto-refund result:`,
      refund,
    );
    return;
  }

  if (isPermanentFulfillmentError(e)) {
    const reason = truncateError(e);
    console.error(
      `[WEBHOOK-PERMANENT-FAIL] event=${event.id} pi=${paymentIntentId}:`,
      reason,
    );
    await refundPaymentIntentIdempotent(paymentIntentId, "webhook_permanent_fail");
    await markEventFailed(event.id, event.type, reason);
    throw new WebhookReturn200();
  }

  if (isTransientError(e)) {
    console.error(`[WEBHOOK-TRANSIENT-FAIL] event=${event.id}:`, e);
  }
  throw e;
}

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

async function fulfillCourseCheckoutSession(sessionId: string) {
  const checkout = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });
  if (checkout.metadata?.kind !== "course_purchase") return;

  const paymentIntent =
    typeof checkout.payment_intent === "string"
      ? await stripe.paymentIntents.retrieve(checkout.payment_intent)
      : checkout.payment_intent;

  if (!paymentIntent || paymentIntent.status !== "succeeded") return;

  await fulfillCoursePurchase({
    stripePaymentId: paymentIntent.id,
    stripeCheckoutSessionId: checkout.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    metadata: checkout.metadata as CoursePaymentMeta,
  });
}

async function fulfillConsultationCheckoutSession(sessionId: string, event: Stripe.Event) {
  const checkout = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });
  if (checkout.metadata?.kind !== "consultation") return;

  const paymentIntent =
    typeof checkout.payment_intent === "string"
      ? await stripe.paymentIntents.retrieve(checkout.payment_intent)
      : checkout.payment_intent;

  if (!paymentIntent || paymentIntent.status !== "succeeded") return;

  try {
    await fulfillConsultationPayment({
      stripePaymentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: checkout.metadata as ConsultationPaymentMeta,
    });
  } catch (e) {
    await handleConsultationFulfillmentError(e, paymentIntent.id, event);
  }
}

async function refundCheckoutSlotTaken(cs: Stripe.Checkout.Session) {
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

async function dispatchStripeEvent(event: Stripe.Event): Promise<void> {
  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const meta = intent.metadata || {};
    if (meta.type === "JIT") {
      console.log(
        `[WEBHOOK] JIT payment succeeded: ${intent.id} (user ${meta.userId || "?"}, session ${meta.sessionId || "?"}) — handled by JIT queue flow, skipping fulfillment.`,
      );
      return;
    }
    if (
      meta.kind === "consultation" ||
      (meta.userId && meta.scheduledAt && (meta.professionalId || meta.psychoanalystId))
    ) {
      try {
        await fulfillConsultationPayment({
          stripePaymentId: intent.id,
          amount: intent.amount,
          currency: intent.currency,
          metadata: meta as ConsultationPaymentMeta,
        });
      } catch (e) {
        await handleConsultationFulfillmentError(e, intent.id, event);
      }
    } else if (meta.kind === "course_purchase" && meta.userId && meta.courseId) {
      await fulfillCoursePurchase({
        stripePaymentId: intent.id,
        amount: intent.amount,
        currency: intent.currency,
        metadata: meta as CoursePaymentMeta,
      });
    }
    return;
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    console.error("[WEBHOOK] Payment failed:", intent.id, intent.last_payment_error?.message);
    return;
  }

  if (event.type === "checkout.session.async_payment_succeeded") {
    const cs = event.data.object as Stripe.Checkout.Session;
    if (cs.mode === "payment" && cs.metadata?.kind === "consultation") {
      try {
        await fulfillConsultationCheckoutSession(cs.id, event);
      } catch (e) {
        if (e instanceof AppointmentSlotTakenError) {
          await refundCheckoutSlotTaken(cs);
          return;
        }
        throw e;
      }
    }
    if (cs.mode === "payment" && cs.metadata?.kind === "course_purchase") {
      await fulfillCourseCheckoutSession(cs.id);
    }
    return;
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const cs = event.data.object as Stripe.Checkout.Session;
    console.error("[WEBHOOK] async payment failed for checkout:", cs.id);
    return;
  }

  if (event.type === "invoice.created") {
    const invoice = event.data.object as Stripe.Invoice;
    if (invoice.subscription && invoice.amount_due > 0) {
      const club = await isClubSubscription(invoice.subscription as string);
      if (!club) return;

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
    }
    return;
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    if (invoice.subscription) {
      const club = await isClubSubscription(invoice.subscription as string);
      if (!club) return;

      const userId = await resolveClubUserId(
        invoice.customer as string,
        invoice.subscription as string,
      );
      if (userId) {
        await awardSubscriptionStamp(userId, invoice.id);
      }
    }
    return;
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    if (invoice.subscription && invoice.customer) {
      const club = await isClubSubscription(invoice.subscription as string);
      if (club) {
        const userId = await updateClubSubscriptionStatus(
          invoice.customer as string,
          invoice.subscription as string,
          "past_due",
        );
        if (userId) await notifyClubPaymentIssue(userId, "notif.clubPayment.failed");
      }
    }
    return;
  }

  if (event.type === "invoice.payment_action_required") {
    const invoice = event.data.object as Stripe.Invoice;
    if (invoice.subscription && invoice.customer) {
      const club = await isClubSubscription(invoice.subscription as string);
      if (club) {
        const userId = await updateClubSubscriptionStatus(
          invoice.customer as string,
          invoice.subscription as string,
          "past_due",
        );
        if (userId) await notifyClubPaymentIssue(userId, "notif.clubPayment.actionRequired");
      }
    }
    return;
  }

  if (event.type === "checkout.session.completed") {
    const cs = event.data.object as Stripe.Checkout.Session;
    if (cs.mode === "payment" && cs.metadata?.kind === "consultation" && cs.payment_status === "paid") {
      try {
        await fulfillConsultationCheckoutSession(cs.id, event);
      } catch (e) {
        if (e instanceof AppointmentSlotTakenError) {
          await refundCheckoutSlotTaken(cs);
        } else {
          throw e;
        }
      }
    }
    if (cs.mode === "payment" && cs.metadata?.kind === "course_purchase" && cs.payment_status === "paid") {
      await fulfillCourseCheckoutSession(cs.id);
    }

    if (cs.mode === "subscription") {
      const planKind = cs.metadata?.planKind;
      const customerId = cs.customer as string;
      const subscriptionId = cs.subscription as string;

      if (planKind === "employer" && cs.metadata?.employerCompanyId && subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const { syncEmployerSubscription } = await import("@/lib/employer-billing");
        await syncEmployerSubscription({
          employerCompanyId: cs.metadata.employerCompanyId,
          stripeCustomerId: customerId,
          subscription: sub,
        });
        return;
      }

      const userId = cs.metadata?.userId;
      if (userId && subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        await db.subscription.upsert({
          where: { userId },
          create: {
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: sub.id,
            stripePriceId: sub.items.data[0]?.price.id ?? null,
            status: sub.status,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
          update: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: sub.id,
            stripePriceId: sub.items.data[0]?.price.id ?? null,
            status: sub.status,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        });
      }
    }
    return;
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = event.data.object as Stripe.Subscription;
    const employerBilling = await db.employerBilling.findFirst({
      where: { stripeCustomerId: sub.customer as string },
    });
    if (employerBilling) {
      const { syncEmployerSubscription } = await import("@/lib/employer-billing");
      await syncEmployerSubscription({
        employerCompanyId: employerBilling.employerCompanyId,
        stripeCustomerId: sub.customer as string,
        subscription: sub,
      });
      if (event.type === "customer.subscription.deleted") {
        await db.employerCompany.update({
          where: { id: employerBilling.employerCompanyId },
          data: { planTier: "PILOT" },
        });
      }
      return;
    }

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
    return;
  }

  if (event.type === "account.updated" && isStripeConnectEnabled()) {
    const account = event.data.object as Stripe.Account;
    logConnectAccountUpdated(account);
  }
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error("[WEBHOOK-CONFIG-ERROR] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "WEBHOOK_MISCONFIGURED" }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[WEBHOOK] Invalid signature:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const prior = await db.processedStripeEvent.findUnique({
    where: { eventId: event.id },
    select: { status: true },
  });
  if (prior?.status === "PROCESSED") {
    console.log(`[WEBHOOK-DEDUP] event=${event.id} type=${event.type}`);
    return NextResponse.json({ received: true, deduped: true });
  }

  try {
    await dispatchStripeEvent(event);
    await markEventProcessed(event.id, event.type);
    return NextResponse.json({ received: true });
  } catch (e) {
    if (e instanceof WebhookReturn200) {
      return NextResponse.json({ received: true });
    }

    const errMsg = truncateError(e);
    await markEventFailed(event.id, event.type, errMsg);

    if (isTransientError(e)) {
      console.error(`[WEBHOOK-TRANSIENT-FAIL] event=${event.id} type=${event.type}:`, e);
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }

    return NextResponse.json({ received: true });
  }
}
