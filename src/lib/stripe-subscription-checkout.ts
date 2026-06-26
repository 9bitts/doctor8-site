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
  paymentMethodTypes?: string[];
  includeBrazilTaxId?: boolean;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.doctor8.org";
  const methodTypes =
    params.paymentMethodTypes ?? getSubscriptionPaymentMethodTypes(params.currency);
  const withTaxId =
    params.includeBrazilTaxId ?? needsBrazilTaxId(params.currency);

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
    ...(withTaxId
      ? {
          tax_id_collection: { enabled: true },
          customer_update: { name: "auto" as const, address: "auto" as const },
        }
      : {}),
  };
}

function stripeErrorMessage(error: unknown): string {
  const e = error as { raw?: { message?: string }; message?: string };
  return e?.raw?.message || e?.message || "unknown";
}

export async function createSubscriptionCheckoutSession(
  params: Parameters<typeof buildSubscriptionCheckoutParams>[0],
): Promise<Stripe.Checkout.Session> {
  const attempts: Parameters<typeof buildSubscriptionCheckoutParams>[0][] = [
    params,
    { ...params, paymentMethodTypes: ["card"] },
    { ...params, paymentMethodTypes: ["card"], includeBrazilTaxId: false },
  ];

  let lastError: unknown;
  for (let i = 0; i < attempts.length; i += 1) {
    const checkoutParams = buildSubscriptionCheckoutParams(attempts[i]);
    try {
      return await stripe.checkout.sessions.create(checkoutParams);
    } catch (error: unknown) {
      lastError = error;
      console.warn(
        `[STRIPE] Subscription checkout attempt ${i + 1}/${attempts.length} failed:`,
        stripeErrorMessage(error),
      );
    }
  }

  throw lastError;
}

export function friendlyStripeCheckoutError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("payment_method_types") || m.includes("payment method type")) {
    return "Forma de pagamento nao disponivel na assinatura. Tente novamente ou use outra moeda.";
  }
  if (m.includes("no such price")) {
    return "Preco da assinatura nao encontrado no Stripe. Verifique se o Price ID esta correto no servidor.";
  }
  if (m.includes("stripe_secret_key") || m.includes("api key") || m.includes("invalid api key")) {
    return "Chave do Stripe invalida no servidor. Verifique STRIPE_SECRET_KEY no Railway.";
  }
  if (m.includes("does not exist") || (m.includes("table") && m.includes("subscription"))) {
    return "Banco de dados desatualizado. Rode prisma migrate deploy no Railway.";
  }
  if (m.includes("tax id collection") || m.includes("customer_update")) {
    return "Nao foi possivel abrir o checkout (CPF/CNPJ). Tente novamente.";
  }
  if (m.includes("currency") && m.includes("price")) {
    return "Moeda do preco nao confere com a regiao escolhida. Contate o suporte.";
  }
  if (message && message.length < 200) {
    return message;
  }
  return "Nao foi possivel abrir o checkout. Tente novamente em instantes.";
}
