// Shared Stripe Checkout options for subscriptions (Club + professional).

import Stripe from "stripe";
import {
  getSubscriptionPaymentMethodTypes,
  needsBrazilTaxId,
} from "@/lib/stripe-payment-methods";
import { stripe } from "@/lib/stripe";

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
      ? {
          tax_id_collection: { enabled: true },
          customer_update: { name: "auto" as const },
        }
      : {}),
  };
}

export async function createSubscriptionCheckoutSession(
  params: Parameters<typeof buildSubscriptionCheckoutParams>[0],
): Promise<Stripe.Checkout.Session> {
  const checkoutParams = buildSubscriptionCheckoutParams(params);
  try {
    return await stripe.checkout.sessions.create(checkoutParams);
  } catch (firstError: unknown) {
    const types = checkoutParams.payment_method_types as string[];
    if (!types.includes("boleto")) throw firstError;

    const reason =
      (firstError as { raw?: { message?: string }; message?: string })?.raw?.message ||
      (firstError as { message?: string })?.message ||
      "unknown";
    console.warn("[STRIPE] Subscription checkout with boleto failed, retrying card-only:", reason);

    return stripe.checkout.sessions.create({
      ...checkoutParams,
      payment_method_types: ["card"],
    });
  }
}

export function friendlyStripeCheckoutError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("payment_method_types") || m.includes("payment method type")) {
    return "Forma de pagamento nao disponivel na assinatura. Tente novamente ou use outra moeda.";
  }
  if (m.includes("no such price")) {
    return "Preco da assinatura nao encontrado no Stripe. Contate o suporte.";
  }
  if (m.includes("stripe_secret_key") || m.includes("api key")) {
    return "Pagamentos nao configurados no servidor. Contate o suporte.";
  }
  if (m.includes("tax id collection") || m.includes("customer_update")) {
    return "Nao foi possivel abrir o checkout (CPF/CNPJ). Tente novamente.";
  }
  return "Nao foi possivel abrir o checkout. Tente novamente em instantes.";
}
