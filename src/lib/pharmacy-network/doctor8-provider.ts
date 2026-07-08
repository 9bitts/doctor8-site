import { db } from "@/lib/db";
import type { PharmacyDrugRef, PharmacyOffer } from "@/lib/pharmacy-marketplace/types";
import { searchPharmacyQuotes, isPharmacyNetworkEnabled } from "@/lib/pharmacy-network/quote";

export const doctor8NetworkProviderId = "doctor8-network" as const;

export async function getDoctor8NetworkOffers(
  drug: PharmacyDrugRef,
  cep?: string,
): Promise<PharmacyOffer[]> {
  if (!isPharmacyNetworkEnabled()) return [];

  let drugCatalogId = drug.drugCatalogId;
  if (!drugCatalogId && drug.name) {
    const { matchMedicationToDrugCatalog } = await import("@/lib/pharmacy-network/quote");
    drugCatalogId =
      (await matchMedicationToDrugCatalog({
        name: drug.name,
        presentation: drug.presentation,
      })) ?? undefined;
  }
  if (!drugCatalogId) return [];

  const quotes = await searchPharmacyQuotes({
    drugCatalogIds: [drugCatalogId],
    cep,
    limit: 5,
  });

  return quotes.map((q) => {
    const item = q.items.find((i) => i.drugCatalogId === drugCatalogId);
    const priceCents = item?.unitPriceCents ?? q.subtotalCents;
    const dist =
      q.distanceKm != null ? `${q.distanceKm.toFixed(1)} km` : q.addressCity || "Doctor8";
    return {
      pharmacyName: `${q.nomeFantasia} (${dist})`,
      priceCents,
      currency: "BRL" as const,
      deliveryEta: q.acceptsDelivery ? "Entrega disponível" : "Retirada",
      inStock: true,
      purchaseUrl: `/patient/pharmacy/buy?storeId=${q.pharmacyStoreId}&drugId=${drugCatalogId}`,
      doctor8StoreId: q.pharmacyStoreId,
    };
  });
}

export async function getNetworkStoreCount(): Promise<number> {
  return db.pharmacyStore.count({
    where: { status: "ACTIVE", inventory: { some: { available: true } } },
  });
}
