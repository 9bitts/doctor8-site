// src/lib/stripe.ts
// Stripe client — used for payments in US, EU and BR
// Handles: one-time consultation payments + Club Doctor subscription

import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
  typescript: true,
});

// Currency per region
export function getCurrency(region: string): string {
  switch (region) {
    case "EU": return "eur";
    case "BR": return "brl";
    default:   return "usd";
  }
}

// Format price for display
export function formatPrice(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

// Create or retrieve Stripe customer for a user
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name: string
): Promise<string> {
  const { db } = await import("@/lib/db");

  const sub = await db.subscription.findUnique({ where: { userId } });
  if (sub?.stripeCustomerId) return sub.stripeCustomerId;

  const customer = await stripe.customers.create({ email, name, metadata: { userId } });

  await db.subscription.upsert({
    where: { userId },
    create: { userId, stripeCustomerId: customer.id, status: "inactive" },
    update: { stripeCustomerId: customer.id },
  });

  return customer.id;
}
