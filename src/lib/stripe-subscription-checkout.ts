// Shared Stripe Checkout options for subscriptions (Club + professional).

import {
  getSubscriptionPaymentMethodTypes,
  needsBrazilTaxId,
} from "@/lib/stripe-payment-methods";

export function buildSubscriptionCheckoutParams(params: {
  customerId: string;
  priceId: string;
  currency: string;
  userId: string;
  planKind: "club" | "professional";
  successPath: string;
  cancelPath: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.doctor8.org";
  const methodTypes = getSubscriptionPaymentMethodTypes(params.currency);

  return {
    customer: params.customerId,
    mode: "subscription" as const,
    payment_method_types: methodTypes as ("card" | "boleto")[],
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: `${appUrl}${params.successPath}`,
    cancel_url: `${appUrl}${params.cancelPath}`,
    metadata: { userId: params.userId, planKind: params.planKind },
    subscription_data: {
      metadata: { userId: params.userId, planKind: params.planKind },
    },
    billing_address_collection: "auto" as const,
    ...(needsBrazilTaxId(params.currency)
      ? { tax_id_collection: { enabled: true } }
      : {}),
  };
}
