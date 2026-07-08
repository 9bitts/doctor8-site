import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { resolveEmployerPlanLimits, type EmployerPlanLimits } from "@/lib/employer-onboarding";

export type EmployerPaidTier = "STARTER" | "GROWTH" | "ENTERPRISE";

export const EMPLOYER_BILLING_PLANS: {
  tier: EmployerPaidTier;
  label: string;
  description: string;
  monthlyHint: string;
}[] = [
  {
    tier: "STARTER",
    label: "Starter",
    description: "Até 100 colaboradores EAP e 4 pesquisas/ano.",
    monthlyHint: "Sob consulta",
  },
  {
    tier: "GROWTH",
    label: "Growth",
    description: "Até 500 colaboradores e 12 pesquisas/ano.",
    monthlyHint: "Sob consulta",
  },
  {
    tier: "ENTERPRISE",
    label: "Enterprise",
    description: "Escala corporativa, limites ampliados e suporte dedicado.",
    monthlyHint: "Sob consulta",
  },
];

const PRICE_ENV: Record<EmployerPaidTier, string | undefined> = {
  STARTER: process.env.STRIPE_PRICE_EMPLOYER_STARTER_BRL,
  GROWTH: process.env.STRIPE_PRICE_EMPLOYER_GROWTH_BRL,
  ENTERPRISE: process.env.STRIPE_PRICE_EMPLOYER_ENTERPRISE_BRL,
};

export function getEmployerPriceId(tier: EmployerPaidTier): string | null {
  return PRICE_ENV[tier] ?? null;
}

export function resolvePlanTierFromPriceId(priceId: string | null | undefined): EmployerPaidTier | "PILOT" {
  if (!priceId) return "PILOT";
  for (const [tier, envPrice] of Object.entries(PRICE_ENV) as [EmployerPaidTier, string | undefined][]) {
    if (envPrice && envPrice === priceId) return tier;
  }
  return "PILOT";
}

export async function getOrCreateEmployerStripeCustomer(params: {
  employerCompanyId: string;
  email: string;
  name: string;
}): Promise<string> {
  const existing = await db.employerBilling.findUnique({
    where: { employerCompanyId: params.employerCompanyId },
    select: { stripeCustomerId: true },
  });
  if (existing?.stripeCustomerId) return existing.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: { employerCompanyId: params.employerCompanyId, planKind: "employer" },
  });

  await db.employerBilling.upsert({
    where: { employerCompanyId: params.employerCompanyId },
    create: {
      employerCompanyId: params.employerCompanyId,
      stripeCustomerId: customer.id,
      status: "trialing",
    },
    update: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function syncEmployerSubscription(params: {
  employerCompanyId: string;
  stripeCustomerId: string;
  subscription: Stripe.Subscription;
}): Promise<void> {
  const priceId = params.subscription.items.data[0]?.price?.id ?? null;
  const tier = resolvePlanTierFromPriceId(priceId);
  const activeStatuses = new Set(["active", "trialing"]);
  const status = params.subscription.status;
  const isPaid = activeStatuses.has(status);

  await db.employerBilling.upsert({
    where: { employerCompanyId: params.employerCompanyId },
    create: {
      employerCompanyId: params.employerCompanyId,
      stripeCustomerId: params.stripeCustomerId,
      stripeSubscriptionId: params.subscription.id,
      stripePriceId: priceId,
      status,
      currentPeriodEnd: new Date(params.subscription.current_period_end * 1000),
      cancelAtPeriodEnd: params.subscription.cancel_at_period_end,
    },
    update: {
      stripeCustomerId: params.stripeCustomerId,
      stripeSubscriptionId: params.subscription.id,
      stripePriceId: priceId,
      status,
      currentPeriodEnd: new Date(params.subscription.current_period_end * 1000),
      cancelAtPeriodEnd: params.subscription.cancel_at_period_end,
    },
  });

  await db.employerCompany.update({
    where: { id: params.employerCompanyId },
    data: { planTier: isPaid ? tier : "PILOT" },
  });
}

export function employerBillingSummary(
  planTier: string,
  billing: {
    status: string;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    stripeSubscriptionId: string | null;
  } | null,
) {
  const limits = resolveEmployerPlanLimits({ planTier });
  return {
    planTier,
    limits,
    billing: {
      status: billing?.status ?? "trialing",
      currentPeriodEnd: billing?.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: billing?.cancelAtPeriodEnd ?? false,
      hasSubscription: Boolean(billing?.stripeSubscriptionId),
    },
    plans: EMPLOYER_BILLING_PLANS.map((p) => ({
      ...p,
      priceConfigured: Boolean(getEmployerPriceId(p.tier)),
    })),
  };
}
