// Billing region / currency options for checkout.

export type BillingRegion = "BR" | "US" | "EU";

export const BILLING_REGION_OPTIONS: {
  region: BillingRegion;
  currency: string;
  labelPt: string;
  priceHint: string;
}[] = [
  { region: "BR", currency: "BRL", labelPt: "Brasil (BRL)", priceHint: "R$ 89,90/mes" },
  { region: "US", currency: "USD", labelPt: "EUA (USD)", priceHint: "US$ 24,90/mes" },
  { region: "EU", currency: "EUR", labelPt: "Europa (EUR)", priceHint: "EUR 22,90/mes" },
];

export function parseBillingRegion(value: unknown, fallback: BillingRegion = "US"): BillingRegion {
  if (value === "BR" || value === "US" || value === "EU") return value;
  return fallback;
}

export function paymentMethodsForRegion(region: BillingRegion): string[] {
  return region === "BR" ? ["card", "pix", "boleto"] : ["card"];
}
