import { getPharmacyIntegrationMode, getPharmacyProviderId } from "./config";
import { consultaRemediosProvider } from "./providers/consulta-remedios";
import type {
  PharmacyDrugRef,
  PharmacyMarketplaceProvider,
  PharmacyOffersResponse,
  PharmacySearchResponse,
} from "./types";

function getProvider(): PharmacyMarketplaceProvider {
  const id = getPharmacyProviderId();
  if (id === "stub") {
    return consultaRemediosProvider;
  }
  return consultaRemediosProvider;
}

export async function searchPharmacyCatalog(
  query: string,
  cep?: string
): Promise<PharmacySearchResponse> {
  const provider = getProvider();
  const mode = getPharmacyIntegrationMode();
  const results =
    mode === "disabled" ? [] : await provider.searchCatalog(query, cep);

  return {
    provider: provider.id,
    mode,
    query,
    cep,
    results,
  };
}

export async function getPharmacyOffers(
  drug: PharmacyDrugRef,
  cep?: string
): Promise<PharmacyOffersResponse> {
  const provider = getProvider();
  const mode = getPharmacyIntegrationMode();
  const fallbackPurchaseUrl = provider.buildPurchaseUrl(drug, cep);
  const offers =
    mode === "disabled" ? [] : await provider.getOffers(drug, cep);

  return {
    provider: provider.id,
    mode,
    drug,
    cep,
    offers,
    fallbackPurchaseUrl,
  };
}

export { getPharmacyPublicConfig } from "./config";
export type * from "./types";
