// src/app/api/payments/subscription/route.ts
// Club Doctor subscription management
//   GET    — current subscription status
//   POST   — start Stripe Checkout for the $10/mo USD plan
//   DELETE — cancel at period end (keeps access until the period ends)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sub = await db.subscription.findUnique({
    where: { userId: session.user.id },
  });
  return NextResponse.json({ subscription: sub });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });
  const patient = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
    select: { firstName: true, lastName: true },
  });
  if (!user || !patient) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const priceId = process.env.STRIPE_PRICE_CLUB_DOCTOR;
  if (!priceId) {
    console.error("[SUBSCRIPTION] STRIPE_PRICE_CLUB_DOCTOR is not set");
    return NextResponse.json({ error: "Subscription is not configured yet." }, { status: 500 });
  }

  const customerId = await getOrCreateStripeCustomer(
    session.user.id,
    user.email,
    `${patient.firstName} ${patient.lastName}`
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.doctor8.org";

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/patient/subscription?subscribed=true`,
    cancel_url: `${appUrl}/patient/subscription`,
    metadata: { userId: session.user.id },
    subscription_data: { metadata: { userId: session.user.id } },
    billing_address_collection: "auto",
  });

  return NextResponse.json({ checkoutUrl: checkoutSession.url });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await db.subscription.findUnique({
    where: { userId: session.user.id },
  });
  if (!sub?.stripeSubscriptionId) {
    return NextResponse.json({ error: "No active subscription" }, { status: 400 });
  }

  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });
  await db.subscription.update({
    where: { userId: session.user.id },
    data: { cancelAtPeriodEnd: true },
  });

  return NextResponse.json({ success: true, message: "Subscription will cancel at period end" });
}
