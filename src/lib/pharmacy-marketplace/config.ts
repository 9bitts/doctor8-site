import type {
  PharmacyIntegrationMode,
  PharmacyProviderId,
  PharmacyPublicConfig,
} from "./types";

function providerFromEnv(): PharmacyProviderId {
  const raw = (process.env.PHARMACY_PROVIDER || "consulta-remedios").toLowerCase();
  if (raw === "stub") return "stub";
  return "consulta-remedios";
}

function hasAffiliateTracking(): boolean {
  return Boolean(
    process.env.PHARMACY_AFFILIATE_ID?.trim() ||
      process.env.PHARMACY_UTM_SOURCE?.trim()
  );
}

function hasApiCredentials(): boolean {
  return Boolean(
    process.env.PHARMACY_API_BASE_URL?.trim() &&
      process.env.PHARMACY_API_KEY?.trim()
  );
}

export function getPharmacyIntegrationMode(): PharmacyIntegrationMode {
  const enabled = process.env.PHARMACY_MARKETPLACE_ENABLED === "true";
  if (!enabled) return "disabled";

  if (hasApiCredentials()) return "api";
  return "deeplink";
}

export function getPharmacyProviderId(): PharmacyProviderId {
  return providerFromEnv();
}

export function getPharmacyUtmParams(): Record<string, string> {
  return {
    utm_source: process.env.PHARMACY_UTM_SOURCE?.trim() || "doctor8",
    utm_medium: process.env.PHARMACY_UTM_MEDIUM?.trim() || "referral",
    ...(process.env.PHARMACY_UTM_CAMPAIGN?.trim()
      ? { utm_campaign: process.env.PHARMACY_UTM_CAMPAIGN.trim() }
      : {}),
    ...(process.env.PHARMACY_AFFILIATE_ID?.trim()
      ? { partner: process.env.PHARMACY_AFFILIATE_ID.trim() }
      : {}),
  };
}

/** UTM on partner links can trigger Cloudflare blocks until Consulta Remédios whitelists Doctor8. */
export function isPharmacyTrackingEnabled(): boolean {
  if (process.env.PHARMACY_UTM_ENABLED === "true") return true;
  if (process.env.PHARMACY_UTM_ENABLED === "false") return false;
  return Boolean(process.env.PHARMACY_AFFILIATE_ID?.trim());
}

export function isPharmacyReferenceEnabled(): boolean {
  const raw = process.env.PHARMACY_REFERENCE_ENABLED;
  if (raw === "false") return false;
  return true;
}

export function getPharmacyPublicConfig(): PharmacyPublicConfig {
  const mode = getPharmacyIntegrationMode();
  const referenceEnabled = isPharmacyReferenceEnabled();
  const marketplaceEnabled = mode !== "disabled";
  return {
    enabled: referenceEnabled || marketplaceEnabled,
    referenceEnabled,
    marketplaceEnabled,
    provider: getPharmacyProviderId(),
    mode,
    requiresCep: marketplaceEnabled,
    affiliateTrackingReady: hasAffiliateTracking(),
  };
}
