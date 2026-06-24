// Public directory search ? live listings for /especialistas/[esp]/[cidade]

import { db } from "@/lib/db";
import { getProfessionInfo, formatLicense } from "@/lib/profession-label";
import { PSYCHOANALYSIS_SPECIALTY } from "@/lib/professions";
import { safeDecrypt } from "@/lib/psychoanalyst-api";
import {
  buildPublicProfilePath,
  cityToSeoSlug,
  specialtyToSeoSlug,
} from "@/lib/public-slugs";
import { getProviderSlotPreview } from "@/lib/availability-slots";
import { getProviderServices, getPracticeLocations } from "@/lib/practice";
import type { ProviderType } from "@/lib/providers";
import type { DaySlots } from "@/lib/availability-slots";

export type PublicSearchResult = {
  providerType: ProviderType;
  providerId: string;
  slug: string;
  firstName: string;
  lastName: string;
  name: string;
  specialty: string;
  specialtySlug: string;
  citySlug: string;
  avatarUrl: string | null;
  license: string | null;
  trainingInstitution: string | null;
  consultPrice: number;
  currency: string;
  acceptsTeleconsult: boolean;
  acceptsInPerson: boolean;
  clinicCity: string | null;
  clinicAddress: string | null;
  clinicLatitude: number | null;
  clinicLongitude: number | null;
  ratingAvg: number | null;
  ratingCount: number;
  healthPlans: { name: string; slug: string }[];
  services: { name: string; priceCents: number | null; currency: string }[];
  locationCount: number;
  publicPath: string;
  slotPreview: DaySlots[];
};

export type PublicSearchOpts = {
  especialidade: string;
  cidade: string;
  convenio?: string | null;
  teleconsult?: boolean;
  presencial?: boolean;
  locale?: string;
};

async function loadReviewMap(providerType: ProviderType) {
  if (providerType === "psychoanalyst") {
    const rows = await db.psychoanalystReview.groupBy({
      by: ["psychoanalystId"],
      _avg: { rating: true },
      _count: { rating: true },
    });
    return new Map(
      rows.map((r) => [
        r.psychoanalystId,
        {
          avg: r._avg.rating ? Math.round(r._avg.rating * 10) / 10 : null,
          count: r._count.rating,
        },
      ])
    );
  }

  const rows = await db.professionalReview.groupBy({
    by: ["professionalId"],
    _avg: { rating: true },
    _count: { rating: true },
  });
  return new Map(
    rows.map((r) => [
      r.professionalId,
      {
        avg: r._avg.rating ? Math.round(r._avg.rating * 10) / 10 : null,
        count: r._count.rating,
      },
    ])
  );
}

function matchesPsychoanalystSpecialty(especialidade: string): boolean {
  return especialidade === "psicanalista";
}

export async function searchPublicListings(
  opts: PublicSearchOpts
): Promise<PublicSearchResult[]> {
  const {
    especialidade,
    cidade,
    convenio,
    teleconsult,
    presencial,
    locale = "pt-BR",
  } = opts;

  const includeOnline = cidade === "online";
  const healthPlanFilter = convenio
    ? await db.healthPlan.findUnique({ where: { slug: convenio } })
    : null;

  const psychoOnly = matchesPsychoanalystSpecialty(especialidade);
  const healthOnly = !psychoOnly;

  const baseCardWhere = {
    isPublic: true,
    specialtySlug: especialidade,
    ...(includeOnline
      ? {}
      : { OR: [{ citySlug: cidade }, { citySlug: "online" }] }),
  };

  const results: PublicSearchResult[] = [];

  if (healthOnly) {
    const cards = await db.virtualCard.findMany({
      where: {
        ...baseCardWhere,
        professionalId: { not: null },
        professional: {
          verified: true,
          ...(teleconsult ? { acceptsTeleconsult: true } : {}),
          ...(presencial ? { acceptsInPerson: true } : {}),
          ...(healthPlanFilter
            ? {
                healthPlans: {
                  some: { healthPlanId: healthPlanFilter.id },
                },
              }
            : {}),
        },
      },
      include: {
        professional: {
          include: {
            healthPlans: { include: { healthPlan: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 60,
    });

    const reviewMap = await loadReviewMap("health");

    for (const card of cards) {
      const p = card.professional;
      if (!p) continue;
      if (!includeOnline && card.citySlug === "online" && !p.acceptsTeleconsult) continue;
      if (!includeOnline && card.citySlug !== cidade && card.citySlug !== "online") continue;

      const info = getProfessionInfo(p.specialty);
      const reviews = reviewMap.get(p.id) ?? { avg: null, count: 0 };

      const slotPreview = await getProviderSlotPreview(p.id, "health", locale);
      const svcRows = await getProviderServices(p.id, "health", true);
      const locRows = await getPracticeLocations(p.id, "health");

      results.push({
        providerType: "health",
        providerId: p.id,
        slug: card.slug,
        firstName: p.firstName,
        lastName: p.lastName,
        name: `${p.firstName} ${p.lastName}`.trim(),
        specialty: p.specialty,
        specialtySlug: card.specialtySlug || specialtyToSeoSlug(p.specialty),
        citySlug: card.citySlug || cityToSeoSlug(p.clinicCity),
        avatarUrl: p.avatarUrl,
        license: formatLicense(p.licenseNumber, p.licenseState, info.councilKey) || null,
        trainingInstitution: null,
        consultPrice: p.consultPrice,
        currency: p.currency,
        acceptsTeleconsult: p.acceptsTeleconsult,
        acceptsInPerson: p.acceptsInPerson,
        clinicCity: p.clinicCity,
        clinicAddress: p.clinicAddress,
        clinicLatitude: p.clinicLatitude,
        clinicLongitude: p.clinicLongitude,
        ratingAvg: reviews.avg,
        ratingCount: reviews.count,
        healthPlans: p.healthPlans.map((hp) => ({
          name: hp.healthPlan.name,
          slug: hp.healthPlan.slug,
        })),
        publicPath: buildPublicProfilePath({
          specialtySlug: card.specialtySlug || specialtyToSeoSlug(p.specialty),
          citySlug: card.citySlug || cityToSeoSlug(p.clinicCity),
          slug: card.slug,
        }),
        services: svcRows.slice(0, 3).map((s) => ({
          name: s.name,
          priceCents: s.priceCents,
          currency: s.currency,
        })),
        locationCount: locRows.length,
        slotPreview,
      });
    }
  }

  if (!healthOnly || psychoOnly) {
    const cards = await db.virtualCard.findMany({
      where: {
        ...baseCardWhere,
        psychoanalystId: { not: null },
        psychoanalyst: {
          verified: true,
          ...(teleconsult ? { acceptsTeleconsult: true } : {}),
          ...(presencial ? { acceptsInPerson: true } : {}),
          ...(healthPlanFilter
            ? {
                healthPlans: {
                  some: { healthPlanId: healthPlanFilter.id },
                },
              }
            : {}),
        },
      },
      include: {
        psychoanalyst: {
          include: {
            healthPlans: { include: { healthPlan: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 60,
    });

    const reviewMap = await loadReviewMap("psychoanalyst");

    for (const card of cards) {
      const p = card.psychoanalyst;
      if (!p) continue;
      if (!psychoOnly && card.specialtySlug !== especialidade) continue;

      const firstName = safeDecrypt(p.firstName);
      const lastName = safeDecrypt(p.lastName);
      const reviews = reviewMap.get(p.id) ?? { avg: null, count: 0 };
      const slotPreview = await getProviderSlotPreview(p.id, "psychoanalyst", locale);
      const svcRows = await getProviderServices(p.id, "psychoanalyst", true);
      const locRows = await getPracticeLocations(p.id, "psychoanalyst");

      results.push({
        providerType: "psychoanalyst",
        providerId: p.id,
        slug: card.slug,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim(),
        specialty: PSYCHOANALYSIS_SPECIALTY,
        specialtySlug: card.specialtySlug || "psicanalista",
        citySlug: card.citySlug || cityToSeoSlug(p.clinicCity),
        avatarUrl: p.avatarUrl,
        license: null,
        trainingInstitution: p.trainingInstitution,
        consultPrice: p.consultPrice,
        currency: p.currency,
        acceptsTeleconsult: p.acceptsTeleconsult,
        acceptsInPerson: p.acceptsInPerson,
        clinicCity: p.clinicCity,
        clinicAddress: p.clinicAddress,
        clinicLatitude: p.clinicLatitude,
        clinicLongitude: p.clinicLongitude,
        ratingAvg: reviews.avg,
        ratingCount: reviews.count,
        healthPlans: p.healthPlans.map((hp) => ({
          name: hp.healthPlan.name,
          slug: hp.healthPlan.slug,
        })),
        publicPath: buildPublicProfilePath({
          specialtySlug: card.specialtySlug || "psicanalista",
          citySlug: card.citySlug || cityToSeoSlug(p.clinicCity),
          slug: card.slug,
        }),
        services: svcRows.slice(0, 3).map((s) => ({
          name: s.name,
          priceCents: s.priceCents,
          currency: s.currency,
        })),
        locationCount: locRows.length,
        slotPreview,
      });
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export async function countPublicListings(
  especialidade: string,
  cidade: string
): Promise<number> {
  const includeOnline = cidade === "online";
  return db.virtualCard.count({
    where: {
      isPublic: true,
      specialtySlug: especialidade,
      ...(includeOnline ? {} : { OR: [{ citySlug: cidade }, { citySlug: "online" }] }),
      OR: [
        { professional: { verified: true } },
        { psychoanalyst: { verified: true } },
      ],
    },
  });
}
