// Pharmacy marketplace ? shared types for affiliate / price-comparison integrations.

export type PharmacyProviderId = "consulta-remedios" | "stub";

/** How purchases are routed to the partner. */
export type PharmacyIntegrationMode = "disabled" | "deeplink" | "api";

export type PharmacyDrugRef = {
  drugCatalogId?: string;
  name: string;
  activeIngredient?: string;
  presentation?: string;
};

/** Regulated CMED reference price (not a pharmacy shelf price). */
export type PharmacyReferencePrice = {
  priceCents: number;
  priceType: "PF_CMED";
  source: "medicamentos.api.br";
  sourceUrl: string;
  cmedTableLabel?: string;
  matchedName: string;
  isRegulatedReference: true;
};

export type PharmacySearchHit = {
  drugCatalogId?: string;
  name: string;
  activeIngredient: string;
  presentation: string;
  manufacturer?: string | null;
  /** Partner product slug or SKU when known (filled after API integration). */
  externalId?: string;
  /** Lowest price in cents (BRL) when API returns offers. */
  lowestPriceCents?: number;
  /** Number of pharmacies with stock (when API provides it). */
  offerCount?: number;
  referencePrice?: PharmacyReferencePrice;
};

export type PharmacyOffer = {
  pharmacyName: string;
  priceCents: number;
  currency: "BRL";
  deliveryEta?: string;
  inStock: boolean;
  purchaseUrl: string;
};

export type PharmacySearchFilters = {
  name?: string;
  manufacturer?: string;
  activeIngredient?: string;
  presentation?: string;
};

export type PharmacySearchResponse = {
  provider: PharmacyProviderId;
  mode: PharmacyIntegrationMode;
  query: string;
  filters: PharmacySearchFilters;
  cep?: string;
  results: PharmacySearchHit[];
};

export type PharmacyOffersResponse = {
  provider: PharmacyProviderId;
  mode: PharmacyIntegrationMode;
  drug: PharmacyDrugRef;
  cep?: string;
  offers: PharmacyOffer[];
  fallbackPurchaseUrl: string;
  reference?: PharmacyReferencePrice | null;
};

export type PharmacyPublicConfig = {
  enabled: boolean;
  referenceEnabled: boolean;
  marketplaceEnabled: boolean;
  provider: PharmacyProviderId;
  mode: PharmacyIntegrationMode;
  requiresCep: boolean;
  affiliateTrackingReady: boolean;
};

export interface PharmacyMarketplaceProvider {
  id: PharmacyProviderId;
  getMode(): PharmacyIntegrationMode;
  searchCatalog(query: string, cep?: string): Promise<PharmacySearchHit[]>;
  getOffers(drug: PharmacyDrugRef, cep?: string): Promise<PharmacyOffer[]>;
  buildPurchaseUrl(drug: PharmacyDrugRef, cep?: string): string;
}
