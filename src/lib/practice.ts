// Practice locations + services — shared CRUD for professionals, psychoanalysts and integrative therapists.

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

type ProfilePricingFields = {
  consultPrice: number;
  currency: string;
  acceptsTeleconsult?: boolean;
  acceptsInPerson?: boolean;
  sessionDurationMins?: number;
};

async function updateProfilePricing(
  providerId: string,
  providerType: ProviderPracticeType,
  data: Partial<ProfilePricingFields>,
) {
  if (providerType === "health") {
    await db.professionalProfile.update({ where: { id: providerId }, data });
    return;
  }
  if (providerType === "psychoanalyst") {
    await db.psychoanalystProfile.update({ where: { id: providerId }, data });
    return;
  }
  await db.integrativeTherapistProfile.update({ where: { id: providerId }, data });
}

/** Creates a default service row from legacy single consultPrice when none exist. */
export async function ensureDefaultServiceFromLegacyPrice(
  providerId: string,
  providerType: ProviderPracticeType,
  legacy: { consultPrice: number; currency: string },
): Promise<void> {
  const existing = await db.providerService.count({
    where: providerWhere(providerId, providerType),
  });
  if (existing > 0) return;
  if (!legacy.consultPrice || legacy.consultPrice <= 0) return;

  await db.providerService.create({
    data: {
      ...providerWhere(providerId, providerType),
      name: "Consulta",
      description: null,
      priceCents: Math.round(legacy.consultPrice),
      currency: legacy.currency || "BRL",
      isActive: true,
      sortOrder: 0,
    },
  });
}

/** Keeps profile.consultPrice in sync with the lowest priced active service (legacy compat). */
export async function syncConsultPriceFromServices(
  providerId: string,
  providerType: ProviderPracticeType,
): Promise<void> {
  const services = await getProviderServices(providerId, providerType, true);
  const named = services.filter((s) => s.name.trim());
  if (named.length === 0) {
    await updateProfilePricing(providerId, providerType, { consultPrice: 0 });
    return;
  }

  const withPrice = named.filter((s) => s.priceCents != null);
  const primary =
    withPrice.find((s) => (s.priceCents ?? 0) > 0) ??
    withPrice[0] ??
    named[0];

  await updateProfilePricing(providerId, providerType, {
    consultPrice: primary.priceCents ?? 0,
    currency: primary.currency || "BRL",
  });
}

export function hasActiveConsultServices(services: ProviderServiceDto[]): boolean {
  return services.some((s) => s.isActive && s.name.trim().length > 0);
}

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

export type ProviderPracticeType = "health" | "psychoanalyst" | "integrative_therapist";

function providerWhere(providerId: string, providerType: ProviderPracticeType) {
  if (providerType === "health") return { professionalId: providerId };
  if (providerType === "psychoanalyst") return { psychoanalystId: providerId };
  return { integrativeTherapistId: providerId };
}

export async function ensureLegacyLocation(
  providerId: string,
  providerType: ProviderPracticeType,
  legacy: LegacyAddress,
) {
  const where = providerWhere(providerId, providerType);

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
  providerType: ProviderPracticeType,
): Promise<PracticeLocationDto[]> {
  const where = providerWhere(providerId, providerType);

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
  providerType: ProviderPracticeType,
  activeOnly = false,
): Promise<ProviderServiceDto[]> {
  const where = {
    ...providerWhere(providerId, providerType),
    ...(activeOnly ? { isActive: true } : {}),
  };

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
  providerType: ProviderPracticeType,
  locations: Omit<PracticeLocationDto, "id">[],
) {
  const where = providerWhere(providerId, providerType);

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
  providerType: ProviderPracticeType,
  services: Omit<ProviderServiceDto, "id">[],
) {
  const where = providerWhere(providerId, providerType);

  await db.providerService.deleteMany({ where });

  const valid = services.filter((s) => s.name.trim());
  if (valid.length > 0) {
    await db.providerService.createMany({
      data: valid.map((svc, i) => ({
        ...where,
        name: svc.name.trim(),
        description: svc.description?.trim() || null,
        priceCents: svc.priceCents,
        currency: svc.currency || "BRL",
        isActive: svc.isActive ?? true,
        sortOrder: svc.sortOrder ?? i,
      })),
    });
  }

  await syncConsultPriceFromServices(providerId, providerType);
}
