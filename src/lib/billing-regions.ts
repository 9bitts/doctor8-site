// Billing region / currency options for checkout.

export type BillingRegion = "BR" | "US" | "EU" | "VE";

export const USER_REGIONS: BillingRegion[] = ["BR", "US", "EU", "VE"];

export const BILLING_REGION_OPTIONS: {
  region: BillingRegion;
  currency: string;
  labelPt: string;
  priceHint: string;
}[] = [
  { region: "BR", currency: "BRL", labelPt: "Brasil (BRL)", priceHint: "R$ 89,90/mes" },
  { region: "US", currency: "USD", labelPt: "EUA (USD)", priceHint: "US$ 24,90/mes" },
  { region: "EU", currency: "EUR", labelPt: "Europa (EUR)", priceHint: "EUR 22,90/mes" },
  { region: "VE", currency: "USD", labelPt: "Venezuela (USD)", priceHint: "US$ 24,90/mes" },
];

export const ACCOUNT_REGION_OPTIONS: {
  value: BillingRegion;
  label: string;
}[] = [
  { value: "BR", label: "Brasil (BRL — PIX, boleto, cartao)" },
  { value: "US", label: "Estados Unidos (USD)" },
  { value: "EU", label: "Europa (EUR)" },
  { value: "VE", label: "Venezuela (USD)" },
];

export function parseBillingRegion(value: unknown, fallback: BillingRegion = "US"): BillingRegion {
  if (value === "BR" || value === "US" || value === "EU" || value === "VE") return value;
  return fallback;
}

export function paymentMethodsForRegion(region: BillingRegion): string[] {
  return region === "BR" ? ["card", "boleto"] : ["card"];
}

export function billingRegionLabel(region: BillingRegion): string {
  return BILLING_REGION_OPTIONS.find((o) => o.region === region)?.labelPt ?? region;
}

export function regionsMismatch(
  profileRegion: BillingRegion,
  billingRegion: BillingRegion,
): boolean {
  return profileRegion !== billingRegion;
}

export const REGION_MISMATCH_MESSAGE =
  "Para pagar na moeda escolhida, altere a regiao da sua conta em Meu Perfil e salve. A moeda de cobranca deve ser a mesma da regiao do cadastro.";

export const SETTINGS_PROFILE_PATH = "/professional/settings";
export const PATIENT_ACCOUNT_PATH = "/patient/account";

export const CLUB_BILLING_REGION_OPTIONS: {
  region: BillingRegion;
  currency: string;
  labelPt: string;
  priceHint: string;
}[] = [
  { region: "BR", currency: "BRL", labelPt: "Brasil (BRL)", priceHint: "R$ 34,90/mes" },
  { region: "US", currency: "USD", labelPt: "EUA (USD)", priceHint: "US$ 9,90/mes" },
  { region: "EU", currency: "EUR", labelPt: "Europa (EUR)", priceHint: "EUR 8,90/mes" },
  { region: "VE", currency: "USD", labelPt: "Venezuela (USD)", priceHint: "US$ 9,90/mes" },
];

export function patientRegionMismatchMessage(): string {
  return "Para pagar na moeda escolhida, altere a regiao da sua conta em Conta e salve. A moeda deve ser a mesma da regiao do cadastro.";
}
