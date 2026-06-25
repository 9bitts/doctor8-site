import { db } from "@/lib/db";
import {
  getPharmacyIntegrationMode,
  getPharmacyProviderId,
  isPharmacyReferenceEnabled,
} from "./config";
import { consultaRemediosProvider } from "./providers/consulta-remedios";
import { getCmedReferencePrice } from "./reference-price";
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

async function searchLocalCatalog(query: string) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  return db.drugCatalog.findMany({
    where: {
      active: true,
      country: "BR",
      OR: [
        { searchName: { contains: q } },
        { searchIngredient: { contains: q } },
      ],
    },
    select: {
      id: true,
      name: true,
      activeIngredient: true,
      presentation: true,
      manufacturer: true,
    },
    orderBy: { name: "asc" },
    take: 20,
  });
}

export async function searchPharmacyCatalog(
  query: string,
  cep?: string
): Promise<PharmacySearchResponse> {
  const provider = getProvider();
  const mode = getPharmacyIntegrationMode();
  const referenceEnabled = isPharmacyReferenceEnabled();

  if (!referenceEnabled && mode === "disabled") {
    return { provider: provider.id, mode, query, cep, results: [] };
  }

  const drugs = await searchLocalCatalog(query);
  const results = drugs.map((drug) => ({
    drugCatalogId: drug.id,
    name: drug.name,
    activeIngredient: drug.activeIngredient,
    presentation: drug.presentation,
    manufacturer: drug.manufacturer,
  }));

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
  const reference = await getCmedReferencePrice(drug);

  return {
    provider: provider.id,
    mode,
    drug,
    cep,
    offers,
    fallbackPurchaseUrl,
    reference,
  };
}

export { getPharmacyPublicConfig, isPharmacyReferenceEnabled } from "./config";
export type * from "./types";
