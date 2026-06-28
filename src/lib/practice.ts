// Practice locations + services ? shared CRUD for professionals and psychoanalysts.

import { db } from "@/lib/db";

export type PracticeLocationDto = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string | null;
  country: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  isPrimary: boolean;
  sortOrder: number;
};

export type ProviderServiceDto = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number | null;
  currency: string;
  isActive: boolean;
  sortOrder: number;
};

type LegacyAddress = {
  clinicName?: string | null;
  clinicAddress?: string | null;
  clinicCity?: string | null;
  clinicState?: string | null;
  clinicCountry?: string | null;
  clinicZip?: string | null;
  clinicLatitude?: number | null;
  clinicLongitude?: number | null;
};

export async function ensureLegacyLocation(
  providerId: string,
  providerType: "health" | "psychoanalyst",
  legacy: LegacyAddress
) {
  const where =
    providerType === "health"
      ? { professionalId: providerId }
      : { psychoanalystId: providerId };

  const count = await db.practiceLocation.count({ where });
  if (count > 0) return;

  const hasAddress = legacy.clinicAddress || legacy.clinicCity;
  if (!hasAddress) return;

  await db.practiceLocation.create({
    data: {
      ...where,
      name: legacy.clinicName || "Consultório principal",
      address: legacy.clinicAddress || "",
      city: legacy.clinicCity || "",
      state: legacy.clinicState,
      country: legacy.clinicCountry,
      zip: legacy.clinicZip,
      latitude: legacy.clinicLatitude,
      longitude: legacy.clinicLongitude,
      isPrimary: true,
      sortOrder: 0,
    },
  });
}

export async function getPracticeLocations(
  providerId: string,
  providerType: "health" | "psychoanalyst"
): Promise<PracticeLocationDto[]> {
  const where =
    providerType === "health"
      ? { professionalId: providerId }
      : { psychoanalystId: providerId };

  const rows = await db.practiceLocation.findMany({
    where,
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    address: r.address,
    city: r.city,
    state: r.state,
    country: r.country,
    zip: r.zip,
    latitude: r.latitude,
    longitude: r.longitude,
    isPrimary: r.isPrimary,
    sortOrder: r.sortOrder,
  }));
}

export async function getProviderServices(
  providerId: string,
  providerType: "health" | "psychoanalyst",
  activeOnly = false
): Promise<ProviderServiceDto[]> {
  const where =
    providerType === "health"
      ? { professionalId: providerId, ...(activeOnly ? { isActive: true } : {}) }
      : { psychoanalystId: providerId, ...(activeOnly ? { isActive: true } : {}) };

  const rows = await db.providerService.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    priceCents: r.priceCents,
    currency: r.currency,
    isActive: r.isActive,
    sortOrder: r.sortOrder,
  }));
}

export async function savePracticeLocations(
  providerId: string,
  providerType: "health" | "psychoanalyst",
  locations: Omit<PracticeLocationDto, "id">[]
) {
  const where =
    providerType === "health"
      ? { professionalId: providerId }
      : { psychoanalystId: providerId };

  await db.practiceLocation.deleteMany({ where });

  if (locations.length === 0) return;

  let primarySet = false;
  await db.practiceLocation.createMany({
    data: locations.map((loc, i) => {
      const isPrimary = loc.isPrimary && !primarySet ? true : !primarySet && i === 0;
      if (isPrimary) primarySet = true;
      return {
        ...where,
        name: loc.name,
        address: loc.address,
        city: loc.city,
        state: loc.state,
        country: loc.country,
        zip: loc.zip,
        latitude: loc.latitude,
        longitude: loc.longitude,
        isPrimary,
        sortOrder: loc.sortOrder ?? i,
      };
    }),
  });
}

export async function saveProviderServices(
  providerId: string,
  providerType: "health" | "psychoanalyst",
  services: Omit<ProviderServiceDto, "id">[]
) {
  const where =
    providerType === "health"
      ? { professionalId: providerId }
      : { psychoanalystId: providerId };

  await db.providerService.deleteMany({ where });

  if (services.length === 0) return;

  await db.providerService.createMany({
    data: services.map((svc, i) => ({
      ...where,
      name: svc.name,
      description: svc.description,
      priceCents: svc.priceCents,
      currency: svc.currency || "BRL",
      isActive: svc.isActive ?? true,
      sortOrder: svc.sortOrder ?? i,
    })),
  });
}
