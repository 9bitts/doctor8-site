import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { distanceKm, geocodeCep } from "./geocode";

export type MedicationLine = {
  name: string;
  dosage?: string;
  presentation?: string;
};

export async function matchMedicationToDrugCatalog(med: MedicationLine): Promise<string | null> {
  const name = med.name?.trim().toLowerCase();
  if (!name) return null;

  const presentation = (med.presentation || med.dosage || "").trim().toLowerCase();

  const candidates = await db.drugCatalog.findMany({
    where: {
      active: true,
      country: "BR",
      OR: [
        { searchName: { contains: name } },
        { name: { contains: med.name, mode: "insensitive" } },
        { searchIngredient: { contains: name } },
      ],
    },
    select: { id: true, presentation: true, searchPresentation: true },
    take: 10,
  });

  if (candidates.length === 0) return null;
  if (!presentation) return candidates[0].id;

  const scored = candidates
    .map((c) => {
      const p = (c.presentation || c.searchPresentation || "").toLowerCase();
      const score = p.includes(presentation) || presentation.includes(p) ? 2 : 0;
      return { id: c.id, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.id ?? candidates[0].id;
}

export async function resolvePrescriptionDrugIds(
  medications: MedicationLine[],
): Promise<{ drugCatalogId: string; med: MedicationLine }[]> {
  const out: { drugCatalogId: string; med: MedicationLine }[] = [];
  for (const med of medications) {
    const drugCatalogId = await matchMedicationToDrugCatalog(med);
    if (drugCatalogId) out.push({ drugCatalogId, med });
  }
  return out;
}

export type PharmacyQuoteItem = {
  drugCatalogId: string;
  drugName: string;
  presentation: string;
  unitPriceCents: number;
  inventoryItemId: string;
  available: boolean;
};

export type PharmacyQuote = {
  pharmacyStoreId: string;
  nomeFantasia: string;
  slug: string;
  addressCity: string | null;
  addressState: string | null;
  addressStreet: string | null;
  addressNeighborhood: string | null;
  addressZip: string | null;
  latitude: number | null;
  longitude: number | null;
  acceptsPickup: boolean;
  acceptsDelivery: boolean;
  distanceKm: number | null;
  items: PharmacyQuoteItem[];
  matchedCount: number;
  requestedCount: number;
  subtotalCents: number;
  platformFeeCents: number;
  coveragePercent: number;
  deliveryFeeCents: number;
};

type StoreRow = Prisma.PharmacyStoreGetPayload<{
  include: {
    inventory: {
      include: { drugCatalog: { select: { id: true; name: true; presentation: true } } };
    };
  };
}>;

export function buildQuoteForStore(
  store: StoreRow,
  drugCatalogIds: string[],
  patientPoint: { latitude: number; longitude: number } | null,
  maxRadiusKm = 50,
): PharmacyQuote | null {
  const inventoryByDrug = new Map(
    store.inventory.filter((i) => i.available).map((i) => [i.drugCatalogId, i]),
  );

  const items: PharmacyQuoteItem[] = [];
  for (const drugId of drugCatalogIds) {
    const inv = inventoryByDrug.get(drugId);
    if (!inv) continue;
    items.push({
      drugCatalogId: drugId,
      drugName: inv.drugCatalog.name,
      presentation: inv.drugCatalog.presentation,
      unitPriceCents: inv.priceCents,
      inventoryItemId: inv.id,
      available: true,
    });
  }

  if (items.length === 0) return null;

  const coveragePercent = Math.round((items.length / drugCatalogIds.length) * 100);
  const subtotalCents = items.reduce((s, i) => s + i.unitPriceCents, 0);

  let distKm: number | null = null;
  if (patientPoint && store.latitude != null && store.longitude != null) {
    distKm = distanceKm(patientPoint, {
      latitude: store.latitude,
      longitude: store.longitude,
    });
    if (distKm > maxRadiusKm) return null;
  }

  return {
    pharmacyStoreId: store.id,
    nomeFantasia: store.nomeFantasia,
    slug: store.slug,
    addressCity: store.addressCity,
    addressState: store.addressState,
    addressStreet: store.addressStreet,
    addressNeighborhood: store.addressNeighborhood,
    addressZip: store.addressZip,
    latitude: store.latitude,
    longitude: store.longitude,
    acceptsPickup: store.acceptsPickup,
    acceptsDelivery: store.acceptsDelivery,
    distanceKm: distKm,
    items,
    matchedCount: items.length,
    requestedCount: drugCatalogIds.length,
    subtotalCents,
    platformFeeCents: store.platformFeeCents,
    coveragePercent,
    deliveryFeeCents: store.acceptsDelivery ? getDefaultDeliveryFeeCents() : 0,
  };
}

export async function searchPharmacyQuotes(opts: {
  drugCatalogIds: string[];
  cep?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  limit?: number;
}): Promise<PharmacyQuote[]> {
  const { drugCatalogIds } = opts;
  if (drugCatalogIds.length === 0) return [];

  let patientPoint: { latitude: number; longitude: number } | null = null;
  if (opts.latitude != null && opts.longitude != null) {
    patientPoint = { latitude: opts.latitude, longitude: opts.longitude };
  } else if (opts.cep) {
    patientPoint = await geocodeCep(opts.cep, opts.city, opts.state);
  }

  const stores = await db.pharmacyStore.findMany({
    where: {
      status: "ACTIVE",
      inventory: {
        some: {
          drugCatalogId: { in: drugCatalogIds },
          available: true,
        },
      },
      ...(opts.city && !patientPoint
        ? { addressCity: { equals: opts.city, mode: "insensitive" } }
        : {}),
      ...(opts.state && !patientPoint
        ? { addressState: { equals: opts.state.toUpperCase() } }
        : {}),
    },
    include: {
      inventory: {
        where: { drugCatalogId: { in: drugCatalogIds }, available: true },
        include: {
          drugCatalog: { select: { id: true, name: true, presentation: true } },
        },
      },
    },
    take: 100,
  });

  const quotes: PharmacyQuote[] = [];
  for (const store of stores) {
    const quote = buildQuoteForStore(store, drugCatalogIds, patientPoint);
    if (quote) quotes.push(quote);
  }

  quotes.sort((a, b) => {
    if (b.coveragePercent !== a.coveragePercent) {
      return b.coveragePercent - a.coveragePercent;
    }
    if (a.subtotalCents !== b.subtotalCents) {
      return a.subtotalCents - b.subtotalCents;
    }
    const da = a.distanceKm ?? 9999;
    const db = b.distanceKm ?? 9999;
    return da - db;
  });

  return quotes.slice(0, opts.limit ?? 15);
}

export function isPharmacyNetworkEnabled(): boolean {
  const raw = process.env.PHARMACY_NETWORK_ENABLED;
  if (raw === "false") return false;
  return true;
}

export function getPharmacyNetworkMinStores(): number {
  const raw = process.env.PHARMACY_NETWORK_MIN_STORES;
  const n = parseInt(raw || "0", 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export async function countActivePharmacyStores(): Promise<number> {
  return db.pharmacyStore.count({
    where: {
      status: "ACTIVE",
      inventory: { some: { available: true } },
    },
  });
}

export async function isPharmacyNetworkPublic(): Promise<boolean> {
  if (!isPharmacyNetworkEnabled()) return false;
  const min = getPharmacyNetworkMinStores();
  if (min <= 0) return true;
  const count = await countActivePharmacyStores();
  return count >= min;
}

export function getDefaultDeliveryFeeCents(): number {
  const raw = process.env.PHARMACY_DELIVERY_FEE_CENTS;
  const n = parseInt(raw || "800", 10);
  return Number.isFinite(n) && n >= 0 ? n : 800;
}

export function calcDeliveryFeeCents(
  acceptsDelivery: boolean,
  fulfillmentType: "PICKUP" | "DELIVERY",
): number {
  if (fulfillmentType !== "DELIVERY" || !acceptsDelivery) return 0;
  return getDefaultDeliveryFeeCents();
}

// ── Patient browse/search (store name + address + drug filter) ──

export type PharmacyStoreSearchHit = {
  pharmacyStoreId: string;
  nomeFantasia: string;
  slug: string;
  addressStreet: string | null;
  addressNeighborhood: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  distanceKm: number | null;
  acceptsPickup: boolean;
  acceptsDelivery: boolean;
  inventoryCount: number;
  matchedItemCount: number;
  coveragePercent: number;
  subtotalCents: number;
};

export type PharmacyStoreInventoryPrice = {
  itemId: string;
  drugCatalogId: string;
  name: string;
  presentation: string;
  priceCents: number;
  stockQty: number | null;
};

const STORE_MAX_RADIUS_KM = 50;

function normalizeDrugSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function resolveDrugCatalogIdsFromMedications(
  medications: MedicationLine[],
): Promise<string[]> {
  const ids: string[] = [];
  for (const med of medications) {
    const id = await matchMedicationToDrugCatalog(med);
    if (id) ids.push(id);
  }
  return [...new Set(ids)];
}

export async function searchPharmacyStores(opts: {
  storeName?: string;
  drugQ?: string;
  medications?: MedicationLine[];
  cep?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  limit?: number;
}): Promise<PharmacyStoreSearchHit[]> {
  let patientPoint: { latitude: number; longitude: number } | null = null;
  if (opts.latitude != null && opts.longitude != null) {
    patientPoint = { latitude: opts.latitude, longitude: opts.longitude };
  } else if (opts.cep) {
    patientPoint = await geocodeCep(opts.cep, opts.city, opts.state);
  }

  let targetDrugIds: string[] = [];
  if (opts.medications?.length) {
    targetDrugIds = await resolveDrugCatalogIdsFromMedications(opts.medications);
  }

  const drugQNorm = opts.drugQ ? normalizeDrugSearch(opts.drugQ) : "";
  if (drugQNorm && targetDrugIds.length === 0) {
    const drugs = await db.drugCatalog.findMany({
      where: {
        active: true,
        country: "BR",
        OR: [
          { name: { contains: opts.drugQ!, mode: "insensitive" } },
          { searchName: { contains: drugQNorm } },
          { searchIngredient: { contains: drugQNorm } },
        ],
      },
      select: { id: true },
      take: 8,
    });
    targetDrugIds = drugs.map((d) => d.id);
  }

  const storeName = opts.storeName?.trim();
  const where: Prisma.PharmacyStoreWhereInput = {
    status: "ACTIVE",
    inventory: { some: { available: true } },
    ...(storeName
      ? {
          OR: [
            { nomeFantasia: { contains: storeName, mode: "insensitive" } },
            { razaoSocial: { contains: storeName, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(targetDrugIds.length > 0
      ? {
          inventory: {
            some: {
              available: true,
              drugCatalogId: { in: targetDrugIds },
            },
          },
        }
      : {}),
    ...(opts.city && !patientPoint
      ? { addressCity: { equals: opts.city, mode: "insensitive" } }
      : {}),
    ...(opts.state && !patientPoint
      ? { addressState: { equals: opts.state.toUpperCase() } }
      : {}),
  };

  const stores = await db.pharmacyStore.findMany({
    where,
    include: {
      inventory: {
        where: { available: true },
        include: {
          drugCatalog: {
            select: { id: true, name: true, presentation: true },
          },
        },
      },
    },
    take: 100,
  });

  const requestedCount = targetDrugIds.length || 0;
  const hits: PharmacyStoreSearchHit[] = [];

  for (const store of stores) {
    let distKm: number | null = null;
    if (patientPoint && store.latitude != null && store.longitude != null) {
      distKm = distanceKm(patientPoint, {
        latitude: store.latitude,
        longitude: store.longitude,
      });
      if (distKm > STORE_MAX_RADIUS_KM) continue;
    }

    const inventoryByDrug = new Map(
      store.inventory.map((i) => [i.drugCatalogId, i]),
    );

    let matchedItems = store.inventory;
    if (targetDrugIds.length > 0) {
      matchedItems = targetDrugIds
        .map((id) => inventoryByDrug.get(id))
        .filter(Boolean) as typeof store.inventory;
    }

    if (targetDrugIds.length > 0 && matchedItems.length === 0) continue;

    const subtotalCents = matchedItems.reduce((s, i) => s + i.priceCents, 0);
    const matchedItemCount = targetDrugIds.length > 0 ? matchedItems.length : store.inventory.length;
    const coveragePercent =
      requestedCount > 0
        ? Math.round((matchedItems.length / requestedCount) * 100)
        : 100;

    hits.push({
      pharmacyStoreId: store.id,
      nomeFantasia: store.nomeFantasia,
      slug: store.slug,
      addressStreet: store.addressStreet,
      addressNeighborhood: store.addressNeighborhood,
      addressCity: store.addressCity,
      addressState: store.addressState,
      addressZip: store.addressZip,
      distanceKm: distKm,
      acceptsPickup: store.acceptsPickup,
      acceptsDelivery: store.acceptsDelivery,
      inventoryCount: store.inventory.length,
      matchedItemCount,
      coveragePercent,
      subtotalCents,
    });
  }

  hits.sort((a, b) => {
    if (requestedCount > 0 && b.coveragePercent !== a.coveragePercent) {
      return b.coveragePercent - a.coveragePercent;
    }
    if (a.subtotalCents !== b.subtotalCents) return a.subtotalCents - b.subtotalCents;
    const da = a.distanceKm ?? 9999;
    const db = b.distanceKm ?? 9999;
    return da - db;
  });

  return hits.slice(0, opts.limit ?? 20);
}

export async function getPharmacyStoreInventoryPrices(
  pharmacyStoreId: string,
  drugQ?: string,
  medications?: MedicationLine[],
): Promise<PharmacyStoreInventoryPrice[]> {
  const drugQNorm = drugQ ? normalizeDrugSearch(drugQ) : "";
  let highlightDrugIds: string[] = [];
  if (medications?.length) {
    highlightDrugIds = await resolveDrugCatalogIdsFromMedications(medications);
  }

  const items = await db.pharmacyStoreInventoryItem.findMany({
    where: {
      pharmacyStoreId,
      available: true,
      ...(drugQNorm
        ? {
            drugCatalog: {
              OR: [
                { searchName: { contains: drugQNorm } },
                { name: { contains: drugQ!, mode: "insensitive" } },
                { searchIngredient: { contains: drugQNorm } },
              ],
            },
          }
        : {}),
      ...(highlightDrugIds.length > 0 && !drugQNorm
        ? { drugCatalogId: { in: highlightDrugIds } }
        : {}),
    },
    include: {
      drugCatalog: {
        select: { id: true, name: true, presentation: true },
      },
    },
    orderBy: { drugCatalog: { name: "asc" } },
    take: 200,
  });

  const prices: PharmacyStoreInventoryPrice[] = items.map((item) => ({
    itemId: item.id,
    drugCatalogId: item.drugCatalogId,
    name: item.drugCatalog.name,
    presentation: item.drugCatalog.presentation,
    priceCents: item.priceCents,
    stockQty: item.stockQty,
  }));

  if (highlightDrugIds.length === 0) return prices;

  return prices.sort((a, b) => {
    const aHit = highlightDrugIds.includes(a.drugCatalogId);
    const bHit = highlightDrugIds.includes(b.drugCatalogId);
    if (aHit && !bHit) return -1;
    if (!aHit && bHit) return 1;
    return a.name.localeCompare(b.name, "pt");
  });
}
