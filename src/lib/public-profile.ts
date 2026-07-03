// Public professional listing ? SEO slugs, VirtualCard sync, profile resolution.

import { db } from "@/lib/db";
import { getProfessionInfo, formatLicense } from "@/lib/profession-label";
import { getProfessionLabel, PSYCHOANALYSIS_SPECIALTY } from "@/lib/professions";
import { safeDecrypt } from "@/lib/psychoanalyst-api";
import type { ProviderType } from "@/lib/providers";
import { INTEGRATIVE_THERAPY_SPECIALTY } from "@/lib/integrative-therapy-specialty";
import { picBySlug, picLabel } from "@/lib/pics/practices";
import { INTEGRATIVE_SEO_SLUG } from "@/lib/public-slugs";

export type PublicProfileProviderType = ProviderType | "integrative";

export {
  APP_BASE_URL,
  slugify,
  specialtyToSeoSlug,
  cityToSeoSlug,
  citySlugToLabel,
  seoSlugToSpecialtyLabel,
  buildPublicSearchPath,
  buildPublicSearchUrl,
  buildProviderSlug,
  buildPublicProfilePath,
  buildPublicProfileUrl,
} from "@/lib/public-slugs";

import {
  specialtyToSeoSlug,
  cityToSeoSlug,
  buildProviderSlug,
  buildPublicProfilePath,
} from "@/lib/public-slugs";
import {
  ensureLegacyLocation,
  getPracticeLocations,
  getProviderServices,
  type PracticeLocationDto,
  type ProviderServiceDto,
} from "@/lib/practice";

export type PublicListingStatus = "pending_approval" | "hidden" | "live";

export function getPublicListingStatus(
  verified: boolean,
  isPublic: boolean
): PublicListingStatus {
  if (!verified) return "pending_approval";
  if (!isPublic) return "hidden";
  return "live";
}

export type PublicProfileData = {
  providerType: PublicProfileProviderType;
  providerId: string;
  slug: string;
  specialtySlug: string;
  citySlug: string;
  firstName: string;
  lastName: string;
  specialty: string;
  subspecialties: string[];
  bio: string | null;
  avatarUrl: string | null;
  license: string | null;
  trainingInstitution: string | null;
  yearsOfPractice: number | null;
  associations: string[];
  consultPrice: number;
  currency: string;
  sessionDurationMins: number;
  acceptsTeleconsult: boolean;
  acceptsInPerson: boolean;
  clinicName: string | null;
  clinicAddress: string | null;
  clinicCity: string | null;
  clinicState: string | null;
  clinicCountry: string | null;
  clinicLatitude: number | null;
  clinicLongitude: number | null;
  verified: boolean;
  headline: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  publicPath: string;
  googleBusinessUrl: string | null;
  locations: PracticeLocationDto[];
  services: ProviderServiceDto[];
  acuraVolunteer: boolean;
};

async function uniqueSlug(base: string): Promise<string> {
  let slug = base || "profissional";
  let n = 1;
  while (await db.virtualCard.findUnique({ where: { slug } })) {
    slug = `${base}-${++n}`;
  }
  return slug;
}

/** Create or update VirtualCard when a provider saves their profile. */
export async function ensureVirtualCard(opts: {
  professionalId?: string;
  psychoanalystId?: string;
  integrativeTherapistId?: string;
  firstName: string;
  lastName: string;
  specialty: string;
  clinicCity?: string | null;
}): Promise<{ slug: string; specialtySlug: string; citySlug: string }> {
  const specialtySlug = specialtyToSeoSlug(opts.specialty);
  const citySlug = cityToSeoSlug(opts.clinicCity);
  const baseSlug = buildProviderSlug(opts.firstName, opts.lastName);

  const existing = await db.virtualCard.findFirst({
    where: opts.professionalId
      ? { professionalId: opts.professionalId }
      : opts.psychoanalystId
        ? { psychoanalystId: opts.psychoanalystId }
        : { integrativeTherapistId: opts.integrativeTherapistId },
  });

  if (existing) {
    const updated = await db.virtualCard.update({
      where: { id: existing.id },
      data: { specialtySlug, citySlug },
    });
    return {
      slug: updated.slug,
      specialtySlug: updated.specialtySlug,
      citySlug: updated.citySlug,
    };
  }

  const slug = await uniqueSlug(baseSlug);
  const created = await db.virtualCard.create({
    data: {
      professionalId: opts.professionalId ?? null,
      psychoanalystId: opts.psychoanalystId ?? null,
      integrativeTherapistId: opts.integrativeTherapistId ?? null,
      slug,
      specialtySlug,
      citySlug,
      isPublic: false,
    },
  });

  return {
    slug: created.slug,
    specialtySlug: created.specialtySlug,
    citySlug: created.citySlug,
  };
}

async function loadReviewStats(
  providerType: ProviderType,
  providerId: string
): Promise<{ avg: number | null; count: number }> {
  if (providerType === "psychoanalyst") {
    const agg = await db.psychoanalystReview.aggregate({
      where: { psychoanalystId: providerId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    return {
      avg: agg._avg.rating
        ? Math.round(agg._avg.rating * 10) / 10
        : null,
      count: agg._count.rating,
    };
  }

  const agg = await db.professionalReview.aggregate({
    where: { professionalId: providerId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return {
    avg: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
    count: agg._count.rating,
  };
}

function mapCardToPublicProfile(
  card: {
    slug: string;
    specialtySlug: string;
    citySlug: string;
    headline: string | null;
    googleBusinessUrl: string | null;
    professional: {
      id: string;
      firstName: string;
      lastName: string;
      specialty: string;
      subspecialties: string[];
      bio: string | null;
      avatarUrl: string | null;
      licenseNumber: string;
      licenseState: string | null;
      consultPrice: number;
      currency: string;
      acceptsTeleconsult: boolean;
      acceptsInPerson: boolean;
      clinicName: string | null;
      clinicAddress: string | null;
      clinicCity: string | null;
      clinicState: string | null;
      clinicCountry: string | null;
      clinicLatitude: number | null;
      clinicLongitude: number | null;
      verified: boolean;
      acuraVolunteer: boolean;
    } | null;
    psychoanalyst: {
      id: string;
      firstName: string;
      lastName: string;
      bio: string | null;
      avatarUrl: string | null;
      trainingInstitution: string;
      yearsOfPractice: number;
      associations: string[];
      consultPrice: number;
      currency: string;
      sessionDurationMins: number;
      acceptsTeleconsult: boolean;
      acceptsInPerson: boolean;
      clinicName: string | null;
      clinicAddress: string | null;
      clinicCity: string | null;
      clinicState: string | null;
      clinicCountry: string | null;
      clinicLatitude: number | null;
      clinicLongitude: number | null;
      verified: boolean;
      acuraVolunteer: boolean;
    } | null;
    integrativeTherapist: {
      id: string;
      firstName: string;
      lastName: string;
      picsPractices: string[];
      bio: string | null;
      avatarUrl: string | null;
      trainingInstitution: string;
      yearsOfPractice: number;
      consultPrice: number;
      currency: string;
      sessionDurationMins: number;
      acceptsTeleconsult: boolean;
      acceptsInPerson: boolean;
      clinicName: string | null;
      clinicAddress: string | null;
      clinicCity: string | null;
      clinicState: string | null;
      clinicCountry: string | null;
      clinicLatitude: number | null;
      clinicLongitude: number | null;
      verified: boolean;
      acuraVolunteer: boolean;
    } | null;
  },
  reviews: { avg: number | null; count: number }
): PublicProfileData | null {
  if (card.professional) {
    const p = card.professional;
    const info = getProfessionInfo(p.specialty);
    return {
      providerType: "health",
      providerId: p.id,
      slug: card.slug,
      specialtySlug: card.specialtySlug,
      citySlug: card.citySlug,
      firstName: p.firstName,
      lastName: p.lastName,
      specialty: p.specialty,
      subspecialties: p.subspecialties,
      bio: p.bio,
      avatarUrl: p.avatarUrl,
      license: formatLicense(p.licenseNumber, p.licenseState, info.councilKey) || null,
      trainingInstitution: null,
      yearsOfPractice: null,
      associations: [],
      consultPrice: p.consultPrice,
      currency: p.currency,
      sessionDurationMins: 30,
      acceptsTeleconsult: p.acceptsTeleconsult,
      acceptsInPerson: p.acceptsInPerson,
      clinicName: p.clinicName,
      clinicAddress: p.clinicAddress,
      clinicCity: p.clinicCity,
      clinicState: p.clinicState,
      clinicCountry: p.clinicCountry,
      clinicLatitude: p.clinicLatitude,
      clinicLongitude: p.clinicLongitude,
      verified: p.verified,
      headline: card.headline,
      ratingAvg: reviews.avg,
      ratingCount: reviews.count,
      publicPath: buildPublicProfilePath(card),
      googleBusinessUrl: card.googleBusinessUrl,
      locations: [],
      services: [],
      acuraVolunteer: p.acuraVolunteer,
    };
  }

  if (card.psychoanalyst) {
    const p = card.psychoanalyst;
    return {
      providerType: "psychoanalyst",
      providerId: p.id,
      slug: card.slug,
      specialtySlug: card.specialtySlug,
      citySlug: card.citySlug,
      firstName: safeDecrypt(p.firstName),
      lastName: safeDecrypt(p.lastName),
      specialty: PSYCHOANALYSIS_SPECIALTY,
      subspecialties: [],
      bio: p.bio,
      avatarUrl: p.avatarUrl,
      license: null,
      trainingInstitution: p.trainingInstitution,
      yearsOfPractice: p.yearsOfPractice,
      associations: p.associations,
      consultPrice: p.consultPrice,
      currency: p.currency,
      sessionDurationMins: p.sessionDurationMins,
      acceptsTeleconsult: p.acceptsTeleconsult,
      acceptsInPerson: p.acceptsInPerson,
      clinicName: p.clinicName,
      clinicAddress: p.clinicAddress,
      clinicCity: p.clinicCity,
      clinicState: p.clinicState,
      clinicCountry: p.clinicCountry,
      clinicLatitude: p.clinicLatitude,
      clinicLongitude: p.clinicLongitude,
      verified: p.verified,
      headline: card.headline,
      ratingAvg: reviews.avg,
      ratingCount: reviews.count,
      publicPath: buildPublicProfilePath(card),
      googleBusinessUrl: card.googleBusinessUrl,
      locations: [],
      services: [],
      acuraVolunteer: p.acuraVolunteer,
    };
  }

  if (card.integrativeTherapist) {
    const p = card.integrativeTherapist;
    const mainPic = p.picsPractices[0] ? picBySlug(p.picsPractices[0]) : undefined;
    const specialtyLabel = mainPic
      ? picLabel(mainPic, "pt")
      : INTEGRATIVE_THERAPY_SPECIALTY;

    return {
      providerType: "integrative",
      providerId: p.id,
      slug: card.slug,
      specialtySlug: card.specialtySlug || INTEGRATIVE_SEO_SLUG,
      citySlug: card.citySlug,
      firstName: p.firstName,
      lastName: p.lastName,
      specialty: specialtyLabel,
      subspecialties: p.picsPractices
        .map((s) => picBySlug(s))
        .filter(Boolean)
        .map((pic) => picLabel(pic!, "pt")),
      bio: p.bio,
      avatarUrl: p.avatarUrl,
      license: null,
      trainingInstitution: p.trainingInstitution,
      yearsOfPractice: p.yearsOfPractice,
      associations: [],
      consultPrice: p.consultPrice,
      currency: p.currency,
      sessionDurationMins: p.sessionDurationMins,
      acceptsTeleconsult: p.acceptsTeleconsult,
      acceptsInPerson: p.acceptsInPerson,
      clinicName: p.clinicName,
      clinicAddress: p.clinicAddress,
      clinicCity: p.clinicCity,
      clinicState: p.clinicState,
      clinicCountry: p.clinicCountry,
      clinicLatitude: p.clinicLatitude,
      clinicLongitude: p.clinicLongitude,
      verified: p.verified,
      headline: card.headline,
      ratingAvg: reviews.avg,
      ratingCount: reviews.count,
      publicPath: buildPublicProfilePath(card),
      googleBusinessUrl: card.googleBusinessUrl,
      locations: [],
      services: [],
      acuraVolunteer: p.acuraVolunteer,
    };
  }

  return null;
}

async function enrichPublicProfile(
  base: PublicProfileData,
  legacy: {
    clinicName?: string | null;
    clinicAddress?: string | null;
    clinicCity?: string | null;
    clinicState?: string | null;
    clinicCountry?: string | null;
    clinicZip?: string | null;
    clinicLatitude?: number | null;
    clinicLongitude?: number | null;
  }
): Promise<PublicProfileData> {
  const practiceType =
    base.providerType === "integrative" ? "integrative_therapist" : base.providerType;
  await ensureLegacyLocation(base.providerId, practiceType, legacy);
  const locations = await getPracticeLocations(base.providerId, practiceType);
  const services = await getProviderServices(base.providerId, practiceType, true);

  return { ...base, locations, services };
}

const cardInclude = {
  professional: true,
  psychoanalyst: true,
  integrativeTherapist: true,
} as const;

function resolveCardProvider(card: {
  professional: { id: string; verified: boolean } | null;
  psychoanalyst: { id: string; verified: boolean } | null;
  integrativeTherapist: { id: string; verified: boolean } | null;
}): {
  providerType: PublicProfileProviderType;
  providerId: string;
  legacy: Record<string, unknown>;
} | null {
  if (card.professional?.verified) {
    return { providerType: "health", providerId: card.professional.id, legacy: card.professional };
  }
  if (card.psychoanalyst?.verified) {
    return { providerType: "psychoanalyst", providerId: card.psychoanalyst.id, legacy: card.psychoanalyst };
  }
  if (card.integrativeTherapist?.verified) {
    return {
      providerType: "integrative",
      providerId: card.integrativeTherapist.id,
      legacy: card.integrativeTherapist,
    };
  }
  return null;
}

/** Resolve a public profile by slug (must be approved + opted in). */
export async function getLivePublicProfileBySlug(
  slug: string
): Promise<PublicProfileData | null> {
  const card = await db.virtualCard.findUnique({
    where: { slug, isPublic: true },
    include: cardInclude,
  });
  if (!card) return null;

  const resolved = resolveCardProvider(card);
  if (!resolved) return null;

  const reviews =
    resolved.providerType === "integrative"
      ? { avg: null, count: 0 }
      : await loadReviewStats(resolved.providerType, resolved.providerId);
  const base = mapCardToPublicProfile(card, reviews);
  if (!base) return null;

  return enrichPublicProfile(base, resolved.legacy);
}

/** Resolve by slug without visibility checks (for redirects / preview). */
export async function getPublicProfileBySlug(
  slug: string
): Promise<PublicProfileData | null> {
  const card = await db.virtualCard.findUnique({
    where: { slug },
    include: cardInclude,
  });
  if (!card) return null;

  const resolved = resolveCardProvider(card);
  if (!resolved) return null;

  const reviews =
    resolved.providerType === "integrative"
      ? { avg: null, count: 0 }
      : await loadReviewStats(resolved.providerType, resolved.providerId);
  const base = mapCardToPublicProfile(card, reviews);
  if (!base) return null;

  return enrichPublicProfile(base, resolved.legacy);
}

export function buildPhysicianJsonLd(
  profile: PublicProfileData,
  url: string
): Record<string, unknown> {
  const name = `${profile.firstName} ${profile.lastName}`.trim();
  const specialtyLabel = getProfessionLabel("pt", profile.specialty);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Physician",
    name,
    medicalSpecialty: specialtyLabel,
    url,
    description: profile.bio || `${specialtyLabel} — ${name}`,
  };

  if (profile.avatarUrl) jsonLd.image = profile.avatarUrl;
  if (profile.license) jsonLd.identifier = profile.license;

  if (profile.clinicAddress || profile.clinicCity) {
    jsonLd.address = {
      "@type": "PostalAddress",
      streetAddress: profile.clinicAddress || undefined,
      addressLocality: profile.clinicCity || undefined,
      addressRegion: profile.clinicState || undefined,
      addressCountry: profile.clinicCountry || undefined,
    };
  }

  if (profile.clinicLatitude != null && profile.clinicLongitude != null) {
    jsonLd.geo = {
      "@type": "GeoCoordinates",
      latitude: profile.clinicLatitude,
      longitude: profile.clinicLongitude,
    };
  }

  if (profile.ratingAvg != null && profile.ratingCount > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: profile.ratingAvg,
      reviewCount: profile.ratingCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (profile.googleBusinessUrl) {
    jsonLd.sameAs = [profile.googleBusinessUrl];
  }

  jsonLd.potentialAction = {
    "@type": "ReserveAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: url,
      actionPlatform: [
        "http://schema.org/DesktopWebPlatform",
        "http://schema.org/MobileWebPlatform",
      ],
    },
    result: {
      "@type": "Reservation",
      name: `Consulta com ${name}`,
    },
  };

  const price = profile.consultPrice / 100;
  if (price > 0) {
    jsonLd.makesOffer = {
      "@type": "Offer",
      price: price.toFixed(2),
      priceCurrency: profile.currency || "BRL",
      name: "Consulta",
    };
  }

  return jsonLd;
}
