// Club Doctor subscription management
//   GET    — current subscription status
//   POST   — start Stripe Checkout (card, PIX, boleto in BRL)
//   DELETE — cancel at period end (keeps access until the period ends)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, getOrCreateStripeCustomer, getCurrency } from "@/lib/stripe";
import { getClubPriceId } from "@/lib/stripe-payment-methods";
import { buildSubscriptionCheckoutParams } from "@/lib/stripe-subscription-checkout";
import { parseBillingRegion, paymentMethodsForRegion, regionsMismatch } from "@/lib/billing-regions";
import { z } from "zod";

const postSchema = z.object({
  region: z.enum(["BR", "US", "EU"]).optional(),
});

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

  let bodyRegion: string | undefined;
  try {
    const raw = await req.json();
    const parsed = postSchema.safeParse(raw);
    if (parsed.success) bodyRegion = parsed.data.region;
  } catch {
    // empty body ok
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, region: true },
  });
  const patient = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
    select: { firstName: true, lastName: true },
  });
  if (!user || !patient) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const profileRegion = parseBillingRegion(user.region || session.user.region, "US");
  const requestedRegion = bodyRegion
    ? parseBillingRegion(bodyRegion, profileRegion)
    : profileRegion;

  if (regionsMismatch(profileRegion, requestedRegion)) {
    return NextResponse.json(
      {
        error:
          "A moeda escolhida nao corresponde a regiao da sua conta. Altere a regiao em Conta para pagar nessa moeda.",
        code: "REGION_MISMATCH",
        profileRegion,
        settingsPath: "/patient/account",
      },
      { status: 400 },
    );
  }

  const region = profileRegion;
  const priceId = getClubPriceId(region);
  if (!priceId) {
    console.error("[SUBSCRIPTION] Club price is not configured for region:", region);
    return NextResponse.json({ error: "Subscription is not configured yet." }, { status: 500 });
  }

  const customerId = await getOrCreateStripeCustomer(
    session.user.id,
    user.email,
    `${patient.firstName} ${patient.lastName}`,
  );

  const currency = getCurrency(region);
  try {
    const checkoutSession = await stripe.checkout.sessions.create(
      buildSubscriptionCheckoutParams({
        customerId,
        priceId,
        currency,
        userId: session.user.id,
        planKind: "club",
        successPath: "/patient/club-doctor?subscribed=true",
        cancelPath: "/patient/club-doctor",
      }),
    );

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      region,
      paymentMethods: paymentMethodsForRegion(region),
    });
  } catch (e: any) {
    console.error("[SUBSCRIPTION] Stripe checkout error:", e?.message || e);
    return NextResponse.json(
      { error: "Nao foi possivel abrir o checkout. Tente novamente em instantes.", code: "STRIPE_ERROR" },
      { status: 502 },
    );
  }
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
