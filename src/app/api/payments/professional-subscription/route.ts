// Professional platform subscription (Doctor Connection)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, getOrCreateStripeCustomer, getCurrency } from "@/lib/stripe";
import { getProfessionalPriceId } from "@/lib/stripe-payment-methods";
import {
  createSubscriptionCheckoutSession,
  friendlyStripeCheckoutError,
} from "@/lib/stripe-subscription-checkout";
import { parseBillingRegion, paymentMethodsForRegion, regionsMismatch } from "@/lib/billing-regions";
import { z } from "zod";

const postSchema = z.object({
  region: z.enum(["BR", "US", "EU"]).optional(),
});

const PROVIDER_ROLES = new Set(["PROFESSIONAL", "PSYCHOANALYST"]);

async function getProviderProfile(userId: string) {
  const professional = await db.professionalProfile.findUnique({
    where: { userId },
    select: { firstName: true, lastName: true },
  });
  if (professional) return professional;

  const psychoanalyst = await db.psychoanalystProfile.findUnique({
    where: { userId },
    select: { firstName: true, lastName: true },
  });
  if (!psychoanalyst) return null;

  const { safeDecrypt } = await import("@/lib/psychoanalyst-api");
  return {
    firstName: safeDecrypt(psychoanalyst.firstName),
    lastName: safeDecrypt(psychoanalyst.lastName),
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!PROVIDER_ROLES.has(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sub = await db.subscription.findUnique({
    where: { userId: session.user.id },
  });
  return NextResponse.json({ subscription: sub });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!PROVIDER_ROLES.has(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
    const profile = await getProviderProfile(session.user.id);
    if (!user || !profile) {
      return NextResponse.json({ error: "Perfil profissional nao encontrado." }, { status: 404 });
    }

    const profileRegion = parseBillingRegion(user.region || session.user.region, "US");
    const requestedRegion = bodyRegion
      ? parseBillingRegion(bodyRegion, profileRegion)
      : profileRegion;

    if (regionsMismatch(profileRegion, requestedRegion)) {
      return NextResponse.json(
        {
          error:
            "A moeda escolhida nao corresponde a regiao da sua conta. Altere a regiao em Meu Perfil para pagar nessa moeda.",
          code: "REGION_MISMATCH",
          profileRegion,
          settingsPath: "/professional/settings",
        },
        { status: 400 },
      );
    }

    const region = profileRegion;
    const priceId = getProfessionalPriceId(region);
    if (!priceId) {
      console.error("[PRO-SUBSCRIPTION] Professional price not configured for region:", region);
      return NextResponse.json(
        {
          error: "Preco do Doctor Connection nao configurado no servidor. Contate o suporte.",
          code: "PRICE_NOT_CONFIGURED",
        },
        { status: 500 },
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Pagamentos nao configurados no servidor.", code: "STRIPE_NOT_CONFIGURED" },
        { status: 503 },
      );
    }

    const customerId = await getOrCreateStripeCustomer(
      session.user.id,
      user.email,
      `${profile.firstName} ${profile.lastName}`.trim() || user.email,
    );

    const currency = getCurrency(region);
    const checkoutSession = await createSubscriptionCheckoutSession({
      customerId,
      priceId,
      currency,
      userId: session.user.id,
      planKind: "professional",
      successPath: "/professional/account?subscribed=true",
      cancelPath: "/professional/account",
    });

    if (!checkoutSession.url) {
      return NextResponse.json(
        { error: "Stripe nao retornou URL de checkout.", code: "STRIPE_NO_URL" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      region,
      paymentMethods: paymentMethodsForRegion(region),
    });
  } catch (e: any) {
    const message = e?.raw?.message || e?.message || "Erro ao iniciar checkout.";
    console.error("[PRO-SUBSCRIPTION] POST error:", message, e);
    return NextResponse.json(
      {
        error: friendlyStripeCheckoutError(message),
        code: "CHECKOUT_FAILED",
        detail: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 502 },
    );
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!PROVIDER_ROLES.has(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
