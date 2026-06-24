// Unified health professional + psychoanalyst listing for patient booking/search.

import { db } from "@/lib/db";
import { getProfessionInfo, formatLicense } from "@/lib/profession-label";

import { PSYCHOANALYSIS_SPECIALTY } from "@/lib/professions";
import { safeDecrypt } from "@/lib/psychoanalyst-api";

export { PSYCHOANALYSIS_SPECIALTY };

export type ProviderType = "health" | "psychoanalyst";

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
}

type ListOpts = {
  specialty?: string | null;
  consultType?: string | null; // TELECONSULT | IN_PERSON
  verifiedOnly?: boolean;
  take?: number;
};

function matchesSpecialtyFilter(filter: string, specialty: string, providerType: ProviderType): boolean {
  if (filter === PSYCHOANALYSIS_SPECIALTY) return providerType === "psychoanalyst";
  if (providerType === "psychoanalyst") return false;
  if (filter === "Psychology") return getProfessionInfo(specialty).typeKey === "psychologist";
  if (filter === "Nutrition") return getProfessionInfo(specialty).typeKey === "nutritionist";
  return specialty.toLowerCase().includes(filter.toLowerCase());
}

export async function listUnifiedProviders(opts: ListOpts = {}): Promise<UnifiedProvider[]> {
  const { specialty, consultType, verifiedOnly = true, take = 100 } = opts;
  const psychoOnly = specialty === PSYCHOANALYSIS_SPECIALTY;
  const healthOnly = specialty && specialty !== PSYCHOANALYSIS_SPECIALTY;

  const healthPros = psychoOnly
    ? []
    : await db.professionalProfile.findMany({
        where: {
          ...(verifiedOnly ? { verified: true } : {}),
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
          virtualCard: { select: { slug: true } },
        },
        orderBy: { firstName: "asc" },
        take,
      });

  const analysts = healthOnly
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
        },
        orderBy: { firstName: "asc" },
        take,
      });

  const healthMapped: UnifiedProvider[] = healthPros
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
    virtualCardSlug: null,
  }));

  return [...healthMapped, ...analystMapped]
    .sort((a, b) => a.firstName.localeCompare(b.firstName))
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
        virtualCard: { select: { slug: true } },
      },
    });
    if (!p) return null;
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
    virtualCardSlug: null,
  };
}

export async function ensureAnalysandForPatient(opts: {
  psychoanalystId: string;
  patientUserId: string;
  patientProfile: { firstName: string; lastName: string };
  patientEmail: string;
}) {
  const { psychoanalystId, patientUserId, patientProfile, patientEmail } = opts;
  const { encrypt } = await import("@/lib/encryption");

  const existing = await db.analysandRecord.findFirst({
    where: { psychoanalystId, linkedUserId: patientUserId },
  });
  if (existing) return existing;

  return db.analysandRecord.create({
    data: {
      psychoanalystId,
      firstName: encrypt(patientProfile.firstName),
      lastName: encrypt(patientProfile.lastName),
      email: patientEmail.toLowerCase(),
      linkedUserId: patientUserId,
      processStartDate: new Date(),
    },
  });
}
