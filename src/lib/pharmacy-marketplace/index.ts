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
  PharmacySearchFilters,
  PharmacySearchResponse,
} from "./types";
import type { Prisma } from "@prisma/client";

function getProvider(): PharmacyMarketplaceProvider {
  const id = getPharmacyProviderId();
  if (id === "stub") {
    return consultaRemediosProvider;
  }
  return consultaRemediosProvider;
}

function normFilter(value?: string): string | undefined {
  const v = value?.trim().toLowerCase();
  return v && v.length >= 2 ? v : undefined;
}

async function searchLocalCatalog(filters: PharmacySearchFilters) {
  const name = normFilter(filters.name);
  const manufacturer = normFilter(filters.manufacturer);
  const activeIngredient = normFilter(filters.activeIngredient);
  const presentation = normFilter(filters.presentation);

  if (!name && !manufacturer && !activeIngredient && !presentation) {
    return [];
  }

  const and: Prisma.DrugCatalogWhereInput[] = [
    { active: true, country: "BR" },
  ];
  if (name) {
    and.push({
      OR: [
        { searchName: { contains: name } },
        { searchIngredient: { contains: name } },
      ],
    });
  }
  if (manufacturer) {
    and.push({ manufacturer: { contains: manufacturer, mode: "insensitive" } });
  }
  if (activeIngredient) {
    and.push({ searchIngredient: { contains: activeIngredient } });
  }
  if (presentation) {
    and.push({ presentation: { contains: presentation, mode: "insensitive" } });
  }

  return db.drugCatalog.findMany({
    where: { AND: and },
    select: {
      id: true,
      name: true,
      activeIngredient: true,
      presentation: true,
      manufacturer: true,
    },
    orderBy: { name: "asc" },
    take: 25,
  });
}

export async function searchPharmacyCatalog(
  filters: PharmacySearchFilters,
  cep?: string
): Promise<PharmacySearchResponse> {
  const provider = getProvider();
  const mode = getPharmacyIntegrationMode();
  const referenceEnabled = isPharmacyReferenceEnabled();

  if (!referenceEnabled && mode === "disabled") {
    return {
      provider: provider.id,
      mode,
      query: filters.name || "",
      filters,
      cep,
      results: [],
    };
  }

  const drugs = await searchLocalCatalog(filters);
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
    query: filters.name || "",
    filters,
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
