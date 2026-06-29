import { db } from "@/lib/db";
import { getPharmacyIntegrationMode } from "../config";
import { buildPartnerPurchaseUrl } from "../partner-url";
import type {
  PharmacyDrugRef,
  PharmacyMarketplaceProvider,
  PharmacyOffer,
  PharmacySearchHit,
} from "../types";

function catalogHitToDrugRef(hit: PharmacySearchHit): PharmacyDrugRef {
  return {
    drugCatalogId: hit.drugCatalogId,
    name: hit.name,
    activeIngredient: hit.activeIngredient,
    presentation: hit.presentation,
  };
}

export const consultaRemediosProvider: PharmacyMarketplaceProvider = {
  id: "consulta-remedios",

  getMode() {
    return getPharmacyIntegrationMode();
  },

  async searchCatalog(query: string, _cep?: string): Promise<PharmacySearchHit[]> {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const drugs = await db.drugCatalog.findMany({
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

    return drugs.map((drug) => ({
      drugCatalogId: drug.id,
      name: drug.name,
      activeIngredient: drug.activeIngredient,
      presentation: drug.presentation,
      manufacturer: drug.manufacturer,
    }));
  },

  async getOffers(drug: PharmacyDrugRef, cep?: string): Promise<PharmacyOffer[]> {
    // API mode: replace with partner API once credentials and contract are in place.
    if (this.getMode() === "api") {
      return fetchPartnerOffers(drug, cep);
    }
    return [];
  },

  buildPurchaseUrl(drug: PharmacyDrugRef, cep?: string): string {
    return buildPartnerPurchaseUrl(drug, cep);
  },
};

async function fetchPartnerOffers(
  drug: PharmacyDrugRef,
  cep?: string
): Promise<PharmacyOffer[]> {
  const baseUrl = process.env.PHARMACY_API_BASE_URL?.trim();
  const apiKey = process.env.PHARMACY_API_KEY?.trim();
  if (!baseUrl || !apiKey) return [];

  try {
    const endpoint = new URL("/offers", baseUrl.replace(/\/+$/, ""));
    endpoint.searchParams.set("q", drug.name);
    if (drug.drugCatalogId) {
      endpoint.searchParams.set("drugCatalogId", drug.drugCatalogId);
    }
    if (cep) endpoint.searchParams.set("cep", cep.replace(/\D/g, ""));

    const res = await fetch(endpoint.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];

    const data = (await res.json()) as {
      offers?: Array<{
        pharmacyName: string;
        priceCents: number;
        deliveryEta?: string;
        inStock?: boolean;
        purchaseUrl: string;
      }>;
    };

    return (data.offers || []).map((offer) => ({
      pharmacyName: offer.pharmacyName,
      priceCents: offer.priceCents,
      currency: "BRL" as const,
      deliveryEta: offer.deliveryEta,
      inStock: offer.inStock ?? true,
      purchaseUrl: offer.purchaseUrl,
    }));
  } catch {
    return [];
  }
}

export function drugRefFromSearchHit(hit: PharmacySearchHit): PharmacyDrugRef {
  return catalogHitToDrugRef(hit);
}
