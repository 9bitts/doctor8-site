import type { PharmacyDrugRef } from "./types";
import { getPharmacyUtmParams, isPharmacyTrackingEnabled } from "./config";

const BASE_URL =
  process.env.PHARMACY_PARTNER_BASE_URL?.trim() ||
  "https://consultaremedios.com.br";

const ALLOWED_HOSTS = new Set([
  "consultaremedios.com.br",
  "www.consultaremedios.com.br",
]);

function appendTracking(url: string): string {
  if (!isPharmacyTrackingEnabled()) return url;
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(getPharmacyUtmParams())) {
    parsed.searchParams.set(key, value);
  }
  return parsed.toString();
}

/** Search page URL ? avoids fragile product slugs that may 404 or trigger WAF. */
export function buildPartnerPurchaseUrl(drug: PharmacyDrugRef, cep?: string): string {
  const url = new URL("/busca", BASE_URL);
  const q = [drug.name, drug.presentation].map((s) => s?.trim()).filter(Boolean).join(" ");
  url.searchParams.set("q", q || drug.name);
  if (drug.activeIngredient?.trim()) {
    url.searchParams.set("principio-ativo", drug.activeIngredient.trim());
  }
  const cepDigits = cep?.replace(/\D/g, "");
  if (cepDigits && cepDigits.length >= 8) {
    url.searchParams.set("cep", cepDigits);
  }
  return appendTracking(url.toString());
}

export function isAllowedPartnerUrl(raw: string): boolean {
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return ALLOWED_HOSTS.has(host);
  } catch {
    return false;
  }
}

export function sanitizePartnerRedirectUrl(raw: string): string | null {
  if (!isAllowedPartnerUrl(raw)) return null;
  return appendTracking(raw);
}

export function pharmacyOutApiPath(drug: PharmacyDrugRef, cep?: string): string {
  const params = new URLSearchParams();
  if (drug.drugCatalogId) params.set("drugCatalogId", drug.drugCatalogId);
  else {
    params.set("name", drug.name);
    if (drug.activeIngredient) params.set("activeIngredient", drug.activeIngredient);
    if (drug.presentation) params.set("presentation", drug.presentation);
  }
  const cepDigits = cep?.replace(/\D/g, "");
  if (cepDigits && cepDigits.length >= 8) params.set("cep", cepDigits);
  return `/api/patient/pharmacy/out?${params}`;
}

export function pharmacyOutApiPathForPartnerUrl(partnerUrl: string): string {
  return `/api/patient/pharmacy/out?partnerUrl=${encodeURIComponent(partnerUrl)}`;
}
