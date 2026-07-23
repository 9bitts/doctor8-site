// Unified health / psychoanalyst / integrative listing for patient booking/search.

import { db } from "@/lib/db";
import { getProfessionInfo, formatLicense } from "@/lib/profession-label";
import { hasListableLicense } from "@/lib/license-validation";

import { PSYCHOANALYSIS_SPECIALTY } from "@/lib/professions";
import { INTEGRATIVE_THERAPY_SPECIALTY } from "@/lib/integrative-therapy-specialty";
import { safeDecrypt } from "@/lib/psychoanalyst-api";
import { compareVolunteerFirst } from "@/lib/acura-volunteer";
import {
  buildPublicProfilePath,
  cityToSeoSlug,
  specialtyToSeoSlug,
} from "@/lib/public-slugs";
export { PSYCHOANALYSIS_SPECIALTY };
export {
  PROVIDER_TYPE_ENUM,
  appointmentProviderFilter,
  bookingProviderIds,
  providerIdMetadataKey,
  resolveBookingProviderId,
  toPracticeProviderType,
  type ProviderType,
} from "@/lib/provider-type";
import type { ProviderType } from "@/lib/provider-type";

type VirtualCardPublicFields = {
  slug: string;
  isPublic: boolean;
  specialtySlug: string;
  citySlug: string;
} | null;

export interface UnifiedProvider {
  id: string;
  providerType: ProviderType;
  firstName: string;
  lastName: string;
  specialty: string;
  bio: string | null;
  avatarUrl: string | null;
  consultPrice: number;
  currency: string;
  acceptsTeleconsult: boolean;
  acceptsInPerson: boolean;
  clinicCity: string | null;
  clinicState: string | null;
  clinicCountry: string | null;
  clinicAddress: string | null;
  clinicZip: string | null;
  clinicLatitude: number | null;
  clinicLongitude: number | null;
  license: string | null;
  trainingInstitution: string | null;
  yearsOfPractice: number | null;
  associations: string[];
  verified: boolean;
  sessionDurationMins: number;
  virtualCardSlug: string | null;
  /** Live public listing path, or null when not published. */
  publicPath: string | null;
  acuraVolunteer: boolean;
}

const VIRTUAL_CARD_PUBLIC_SELECT = {
  slug: true,
  isPublic: true,
  specialtySlug: true,
  citySlug: true,
} as const;

function resolvePublicPath(
  verified: boolean,
  card: VirtualCardPublicFields,
  specialty: string,
  clinicCity: string | null,
): string | null {
  if (!verified || !card?.isPublic || !card.slug) return null;
  return buildPublicProfilePath({
    specialtySlug: card.specialtySlug || specialtyToSeoSlug(specialty),
    citySlug: card.citySlug || cityToSeoSlug(clinicCity),
    slug: card.slug,
  });
}

type ListOpts = {
  specialty?: string | null;
  consultType?: string | null; // TELECONSULT | IN_PERSON
  verifiedOnly?: boolean;
  take?: number;
};

function matchesSpecialtyFilter(filter: string, specialty: string, providerType: ProviderType): boolean {
  if (filter === PSYCHOANALYSIS_SPECIALTY) return providerType === "psychoanalyst";
  if (filter === INTEGRATIVE_THERAPY_SPECIALTY) return providerType === "integrative";
  if (providerType === "psychoanalyst" || providerType === "integrative") return false;
  if (filter === "Psychology") return getProfessionInfo(specialty).typeKey === "psychologist";
  if (filter === "Nutrition") return getProfessionInfo(specialty).typeKey === "nutritionist";
  return specialty.toLowerCase().includes(filter.toLowerCase());
}

export async function listUnifiedProviders(opts: ListOpts = {}): Promise<UnifiedProvider[]> {
  const { specialty, consultType, verifiedOnly = true, take = 100 } = opts;
  const psychoOnly = specialty === PSYCHOANALYSIS_SPECIALTY;
  const integrativeOnly = specialty === INTEGRATIVE_THERAPY_SPECIALTY;
  const healthOnly = Boolean(specialty && !psychoOnly && !integrativeOnly);

  const healthPros = psychoOnly || integrativeOnly
    ? []
    : await db.professionalProfile.findMany({
        where: {
          ...(verifiedOnly ? { verified: true } : {}),
          licenseNumber: { not: "" },
          ...(consultType === "TELECONSULT" ? { acceptsTeleconsult: true } : {}),
          ...(consultType === "IN_PERSON" ? { acceptsInPerson: true } : {}),
          ...(specialty && specialty !== "Psychology" && specialty !== "Nutrition"
            ? { specialty: { equals: specialty, mode: "insensitive" as const } }
            : {}),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          specialty: true,
          bio: true,
          avatarUrl: true,
          consultPrice: true,
          currency: true,
          acceptsTeleconsult: true,
          acceptsInPerson: true,
          clinicCity: true,
          clinicState: true,
          clinicCountry: true,
          clinicAddress: true,
          clinicZip: true,
          clinicLatitude: true,
          clinicLongitude: true,
          licenseNumber: true,
          licenseState: true,
          verified: true,
          virtualCard: { select: VIRTUAL_CARD_PUBLIC_SELECT },
          acuraVolunteer: true,
        },
        orderBy: { firstName: "asc" },
        take,
      });

  const analysts = healthOnly || integrativeOnly
    ? []
    : await db.psychoanalystProfile.findMany({
        where: {
          ...(verifiedOnly ? { verified: true } : {}),
          ...(consultType === "TELECONSULT" ? { acceptsTeleconsult: true } : {}),
          ...(consultType === "IN_PERSON" ? { acceptsInPerson: true } : {}),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          bio: true,
          avatarUrl: true,
          consultPrice: true,
          currency: true,
          acceptsTeleconsult: true,
          acceptsInPerson: true,
          clinicCity: true,
          clinicState: true,
          clinicCountry: true,
          clinicAddress: true,
          clinicZip: true,
          clinicLatitude: true,
          clinicLongitude: true,
          trainingInstitution: true,
          yearsOfPractice: true,
          associations: true,
          verified: true,
          sessionDurationMins: true,
          virtualCard: { select: VIRTUAL_CARD_PUBLIC_SELECT },
          acuraVolunteer: true,
        },
        orderBy: { firstName: "asc" },
        take,
      });

  const integrativePros = psychoOnly || healthOnly
    ? []
    : await db.integrativeTherapistProfile.findMany({
        where: {
          ...(verifiedOnly ? { verified: true } : {}),
          ...(consultType === "TELECONSULT" ? { acceptsTeleconsult: true } : {}),
          ...(consultType === "IN_PERSON" ? { acceptsInPerson: true } : {}),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          bio: true,
          avatarUrl: true,
          consultPrice: true,
          currency: true,
          acceptsTeleconsult: true,
          acceptsInPerson: true,
          clinicCity: true,
          clinicState: true,
          clinicCountry: true,
          clinicAddress: true,
          clinicZip: true,
          clinicLatitude: true,
          clinicLongitude: true,
          trainingInstitution: true,
          yearsOfPractice: true,
          verified: true,
          sessionDurationMins: true,
          virtualCard: { select: VIRTUAL_CARD_PUBLIC_SELECT },
          acuraVolunteer: true,
        },
        orderBy: { firstName: "asc" },
        take,
      });

  const healthMapped: UnifiedProvider[] = healthPros
    .filter((p) => hasListableLicense(p.licenseNumber))
    .filter((p) => !specialty || specialty === PSYCHOANALYSIS_SPECIALTY || matchesSpecialtyFilter(specialty, p.specialty, "health"))
    .map((p) => {
      const info = getProfessionInfo(p.specialty);
      return {
        id: p.id,
        providerType: "health" as const,
        firstName: p.firstName,
        lastName: p.lastName,
        specialty: p.specialty,
        bio: p.bio,
        avatarUrl: p.avatarUrl,
        consultPrice: p.consultPrice,
        currency: p.currency,
        acceptsTeleconsult: p.acceptsTeleconsult,
        acceptsInPerson: p.acceptsInPerson,
        clinicCity: p.clinicCity,
        clinicState: p.clinicState,
        clinicCountry: p.clinicCountry,
        clinicAddress: p.clinicAddress,
        clinicZip: p.clinicZip,
        clinicLatitude: p.clinicLatitude,
        clinicLongitude: p.clinicLongitude,
        license: formatLicense(p.licenseNumber, p.licenseState, info.councilKey) || null,
        trainingInstitution: null,
        yearsOfPractice: null,
        associations: [],
        verified: p.verified,
        sessionDurationMins: 30,
        virtualCardSlug: p.virtualCard?.slug ?? null,
        publicPath: resolvePublicPath(p.verified, p.virtualCard, p.specialty, p.clinicCity),
        acuraVolunteer: p.acuraVolunteer,
      };
    });

  const analystMapped: UnifiedProvider[] = analysts.map((p) => ({
    id: p.id,
    providerType: "psychoanalyst" as const,
    firstName: safeDecrypt(p.firstName),
    lastName: safeDecrypt(p.lastName),
    specialty: PSYCHOANALYSIS_SPECIALTY,
    bio: p.bio,
    avatarUrl: p.avatarUrl,
    consultPrice: p.consultPrice,
    currency: p.currency,
    acceptsTeleconsult: p.acceptsTeleconsult,
    acceptsInPerson: p.acceptsInPerson,
    clinicCity: p.clinicCity,
    clinicState: p.clinicState,
    clinicCountry: p.clinicCountry,
    clinicAddress: p.clinicAddress,
    clinicZip: p.clinicZip,
    clinicLatitude: p.clinicLatitude,
    clinicLongitude: p.clinicLongitude,
    license: null,
    trainingInstitution: p.trainingInstitution,
    yearsOfPractice: p.yearsOfPractice,
    associations: p.associations,
    verified: p.verified,
    sessionDurationMins: p.sessionDurationMins,
    virtualCardSlug: p.virtualCard?.slug ?? null,
    publicPath: resolvePublicPath(
      p.verified,
      p.virtualCard,
      PSYCHOANALYSIS_SPECIALTY,
      p.clinicCity,
    ),
    acuraVolunteer: p.acuraVolunteer,
  }));

  const integrativeMapped: UnifiedProvider[] = integrativePros.map((p) => ({
    id: p.id,
    providerType: "integrative" as const,
    firstName: p.firstName,
    lastName: p.lastName,
    specialty: INTEGRATIVE_THERAPY_SPECIALTY,
    bio: p.bio,
    avatarUrl: p.avatarUrl,
    consultPrice: p.consultPrice,
    currency: p.currency,
    acceptsTeleconsult: p.acceptsTeleconsult,
    acceptsInPerson: p.acceptsInPerson,
    clinicCity: p.clinicCity,
    clinicState: p.clinicState,
    clinicCountry: p.clinicCountry,
    clinicAddress: p.clinicAddress,
    clinicZip: p.clinicZip,
    clinicLatitude: p.clinicLatitude,
    clinicLongitude: p.clinicLongitude,
    license: null,
    trainingInstitution: p.trainingInstitution,
    yearsOfPractice: p.yearsOfPractice,
    associations: [],
    verified: p.verified,
    sessionDurationMins: p.sessionDurationMins,
    virtualCardSlug: p.virtualCard?.slug ?? null,
    publicPath: resolvePublicPath(
      p.verified,
      p.virtualCard,
      INTEGRATIVE_THERAPY_SPECIALTY,
      p.clinicCity,
    ),
    acuraVolunteer: p.acuraVolunteer,
  }));

  return [...healthMapped, ...analystMapped, ...integrativeMapped]
    .sort(compareVolunteerFirst)
    .slice(0, take);
}

export async function getUnifiedProvider(
  id: string,
  providerType: ProviderType
): Promise<UnifiedProvider | null> {
  if (providerType === "health") {
    const p = await db.professionalProfile.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialty: true,
        bio: true,
        avatarUrl: true,
        consultPrice: true,
        currency: true,
        acceptsTeleconsult: true,
        acceptsInPerson: true,
        clinicCity: true,
        clinicState: true,
        clinicCountry: true,
        clinicAddress: true,
        clinicZip: true,
        clinicLatitude: true,
        clinicLongitude: true,
        licenseNumber: true,
        licenseState: true,
        verified: true,
        virtualCard: { select: VIRTUAL_CARD_PUBLIC_SELECT },
        acuraVolunteer: true,
      },
    });
    if (!p) return null;
    if (!hasListableLicense(p.licenseNumber)) return null;
    const info = getProfessionInfo(p.specialty);
    return {
      id: p.id,
      providerType: "health",
      firstName: p.firstName,
      lastName: p.lastName,
      specialty: p.specialty,
      bio: p.bio,
      avatarUrl: p.avatarUrl,
      consultPrice: p.consultPrice,
      currency: p.currency,
      acceptsTeleconsult: p.acceptsTeleconsult,
      acceptsInPerson: p.acceptsInPerson,
      clinicCity: p.clinicCity,
      clinicState: p.clinicState,
      clinicCountry: p.clinicCountry,
      clinicAddress: p.clinicAddress,
      clinicZip: p.clinicZip,
      clinicLatitude: p.clinicLatitude,
      clinicLongitude: p.clinicLongitude,
      license: formatLicense(p.licenseNumber, p.licenseState, info.councilKey) || null,
      trainingInstitution: null,
      yearsOfPractice: null,
      associations: [],
      verified: p.verified,
      sessionDurationMins: 30,
      virtualCardSlug: p.virtualCard?.slug ?? null,
      publicPath: resolvePublicPath(p.verified, p.virtualCard, p.specialty, p.clinicCity),
      acuraVolunteer: p.acuraVolunteer,
    };
  }

  if (providerType === "integrative") {
    const p = await db.integrativeTherapistProfile.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        bio: true,
        avatarUrl: true,
        consultPrice: true,
        currency: true,
        acceptsTeleconsult: true,
        acceptsInPerson: true,
        clinicCity: true,
        clinicState: true,
        clinicCountry: true,
        clinicAddress: true,
        clinicZip: true,
        clinicLatitude: true,
        clinicLongitude: true,
        trainingInstitution: true,
        yearsOfPractice: true,
        verified: true,
        sessionDurationMins: true,
        virtualCard: { select: VIRTUAL_CARD_PUBLIC_SELECT },
        acuraVolunteer: true,
      },
    });
    if (!p) return null;
    return {
      id: p.id,
      providerType: "integrative",
      firstName: p.firstName,
      lastName: p.lastName,
      specialty: INTEGRATIVE_THERAPY_SPECIALTY,
      bio: p.bio,
      avatarUrl: p.avatarUrl,
      consultPrice: p.consultPrice,
      currency: p.currency,
      acceptsTeleconsult: p.acceptsTeleconsult,
      acceptsInPerson: p.acceptsInPerson,
      clinicCity: p.clinicCity,
      clinicState: p.clinicState,
      clinicCountry: p.clinicCountry,
      clinicAddress: p.clinicAddress,
      clinicZip: p.clinicZip,
      clinicLatitude: p.clinicLatitude,
      clinicLongitude: p.clinicLongitude,
      license: null,
      trainingInstitution: p.trainingInstitution,
      yearsOfPractice: p.yearsOfPractice,
      associations: [],
      verified: p.verified,
      sessionDurationMins: p.sessionDurationMins,
      virtualCardSlug: p.virtualCard?.slug ?? null,
      publicPath: resolvePublicPath(
        p.verified,
        p.virtualCard,
        INTEGRATIVE_THERAPY_SPECIALTY,
        p.clinicCity,
      ),
      acuraVolunteer: p.acuraVolunteer,
    };
  }

  const p = await db.psychoanalystProfile.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      bio: true,
      avatarUrl: true,
      consultPrice: true,
      currency: true,
      acceptsTeleconsult: true,
      acceptsInPerson: true,
      clinicCity: true,
      clinicState: true,
      clinicCountry: true,
      clinicAddress: true,
      clinicZip: true,
      clinicLatitude: true,
      clinicLongitude: true,
      trainingInstitution: true,
      yearsOfPractice: true,
      associations: true,
      verified: true,
      sessionDurationMins: true,
      virtualCard: { select: VIRTUAL_CARD_PUBLIC_SELECT },
      acuraVolunteer: true,
    },
  });
  if (!p) return null;
  return {
    id: p.id,
    providerType: "psychoanalyst",
    firstName: safeDecrypt(p.firstName),
    lastName: safeDecrypt(p.lastName),
    specialty: PSYCHOANALYSIS_SPECIALTY,
    bio: p.bio,
    avatarUrl: p.avatarUrl,
    consultPrice: p.consultPrice,
    currency: p.currency,
    acceptsTeleconsult: p.acceptsTeleconsult,
    acceptsInPerson: p.acceptsInPerson,
    clinicCity: p.clinicCity,
    clinicState: p.clinicState,
    clinicCountry: p.clinicCountry,
    clinicAddress: p.clinicAddress,
    clinicZip: p.clinicZip,
    clinicLatitude: p.clinicLatitude,
    clinicLongitude: p.clinicLongitude,
    license: null,
    trainingInstitution: p.trainingInstitution,
    yearsOfPractice: p.yearsOfPractice,
    associations: p.associations,
    verified: p.verified,
    sessionDurationMins: p.sessionDurationMins,
    virtualCardSlug: p.virtualCard?.slug ?? null,
    publicPath: resolvePublicPath(
      p.verified,
      p.virtualCard,
      PSYCHOANALYSIS_SPECIALTY,
      p.clinicCity,
    ),
    acuraVolunteer: p.acuraVolunteer,
  };
}

export async function ensureIntegrativeClientForPatient(opts: {
  integrativeTherapistId: string;
  patientUserId: string;
  patientProfile: { firstName: string; lastName: string };
  patientEmail: string;
}) {
  const { ensureIntegrativeClientRecord } = await import("@/lib/ensure-integrative-client-record");
  const recordId = await ensureIntegrativeClientRecord(
    opts.integrativeTherapistId,
    opts.patientUserId,
  );
  if (recordId) {
    return db.integrativeClientRecord.findUniqueOrThrow({ where: { id: recordId } });
  }

  const { encrypt } = await import("@/lib/encryption");
  const { decrypt } = await import("@/lib/encryption");
  function safeDecrypt(v: string): string {
    try { return decrypt(v); } catch { return v; }
  }

  return db.integrativeClientRecord.create({
    data: {
      integrativeTherapistId: opts.integrativeTherapistId,
      firstName: encrypt(safeDecrypt(opts.patientProfile.firstName)),
      lastName: encrypt(safeDecrypt(opts.patientProfile.lastName)),
      email: opts.patientEmail.toLowerCase(),
      linkedUserId: opts.patientUserId,
      processStartDate: new Date(),
    },
  });
}

export async function ensureAnalysandForPatient(opts: {
  psychoanalystId: string;
  patientUserId: string;
  patientProfile: { firstName: string; lastName: string };
  patientEmail: string;
}) {
  const { ensureAnalysandRecord } = await import("@/lib/ensure-analysand-record");
  const recordId = await ensureAnalysandRecord(opts.psychoanalystId, opts.patientUserId);
  if (recordId) {
    return db.analysandRecord.findUniqueOrThrow({ where: { id: recordId } });
  }

  const { encrypt } = await import("@/lib/encryption");
  const { decrypt } = await import("@/lib/encryption");
  function safeDecrypt(v: string): string {
    try { return decrypt(v); } catch { return v; }
  }

  return db.analysandRecord.create({
    data: {
      psychoanalystId: opts.psychoanalystId,
      firstName: encrypt(safeDecrypt(opts.patientProfile.firstName)),
      lastName: encrypt(safeDecrypt(opts.patientProfile.lastName)),
      email: opts.patientEmail.toLowerCase(),
      linkedUserId: opts.patientUserId,
      processStartDate: new Date(),
    },
  });
}
