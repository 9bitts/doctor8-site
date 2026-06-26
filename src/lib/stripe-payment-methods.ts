// Stripe payment method configuration for Brazil and international.

export type ConsultationPaymentMethod = "card" | "pix" | "boleto" | "all";

export function getConsultationPaymentMethodTypes(
  currency: string,
  preferred?: ConsultationPaymentMethod,
): string[] {
  const cur = currency.toLowerCase();
  if (cur !== "brl") return ["card"];

  if (preferred === "card") return ["card"];
  if (preferred === "pix") return ["pix"];
  if (preferred === "boleto") return ["boleto"];
  return ["card", "pix", "boleto"];
}

export function getSubscriptionPaymentMethodTypes(currency: string): string[] {
  const cur = currency.toLowerCase();
  // Recurring: card + boleto in BR. PIX recorrente (Pix Automatico) exige setup extra no Stripe.
  if (cur === "brl") return ["card", "boleto"];
  return ["card"];
}

export function needsBrazilTaxId(currency: string): boolean {
  return currency.toLowerCase() === "brl";
}

export function usesHostedCheckout(currency: string, preferred?: ConsultationPaymentMethod): boolean {
  const cur = currency.toLowerCase();
  if (cur !== "brl") return false;
  return preferred !== "card";
}

export function getClubPriceId(region: string): string | null {
  switch (region) {
    case "BR":
      return (
        process.env.STRIPE_PRICE_CLUB_DOCTOR_BRL ||
        process.env.STRIPE_PRICE_CLUB_DOCTOR ||
        null
      );
    case "EU":
      return (
        process.env.STRIPE_PRICE_CLUB_DOCTOR_EU ||
        process.env.STRIPE_PRICE_CLUB_DOCTOR ||
        null
      );
    case "VE":
      return (
        process.env.STRIPE_PRICE_CLUB_DOCTOR_VE ||
        process.env.STRIPE_PRICE_CLUB_DOCTOR_US ||
        process.env.STRIPE_PRICE_CLUB_DOCTOR ||
        null
      );
    default:
      return (
        process.env.STRIPE_PRICE_CLUB_DOCTOR_US ||
        process.env.STRIPE_PRICE_CLUB_DOCTOR ||
        null
      );
  }
}

export function getProfessionalPriceId(region: string): string | null {
  switch (region) {
    case "BR":
      return (
        process.env.STRIPE_PRICE_PROFESSIONAL_BRL ||
        process.env.STRIPE_PRICE_PROFESSIONAL ||
        null
      );
    case "EU":
      return (
        process.env.STRIPE_PRICE_PROFESSIONAL_EU ||
        process.env.STRIPE_PRICE_PROFESSIONAL ||
        null
      );
    case "VE":
      return (
        process.env.STRIPE_PRICE_PROFESSIONAL_VE ||
        process.env.STRIPE_PRICE_PROFESSIONAL_US ||
        process.env.STRIPE_PRICE_PROFESSIONAL ||
        null
      );
    default:
      return (
        process.env.STRIPE_PRICE_PROFESSIONAL_US ||
        process.env.STRIPE_PRICE_PROFESSIONAL ||
        null
      );
  }
}

export function isClubPriceId(priceId: string | null | undefined): boolean {
  if (!priceId) return true;
  const clubIds = [
    process.env.STRIPE_PRICE_CLUB_DOCTOR,
    process.env.STRIPE_PRICE_CLUB_DOCTOR_US,
    process.env.STRIPE_PRICE_CLUB_DOCTOR_EU,
    process.env.STRIPE_PRICE_CLUB_DOCTOR_BRL,
    process.env.STRIPE_PRICE_CLUB_DOCTOR_VE,
  ].filter(Boolean);
  return clubIds.includes(priceId);
}
