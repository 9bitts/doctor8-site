import { db } from "@/lib/db";
import type { UserRole } from "@prisma/client";
import { getProviderServices, hasActiveConsultServices } from "@/lib/practice";

export type RegistrationChecklistKey =
  | "professionalData"
  | "verificationDocuments"
  | "careSettings";

export type RegistrationChecklist = Record<RegistrationChecklistKey, boolean>;

export type ProviderRegistrationStatus = {
  complete: boolean;
  verified: boolean;
  checklist: RegistrationChecklist;
  missing: RegistrationChecklistKey[];
};

export const REGISTRATION_CHECKLIST_KEYS: RegistrationChecklistKey[] = [
  "professionalData",
  "verificationDocuments",
  "careSettings",
];

export function registrationChecklistHash(key: RegistrationChecklistKey): string {
  return `registration-${key}`;
}

function buildChecklistStatus(checklist: RegistrationChecklist): Pick<
  ProviderRegistrationStatus,
  "complete" | "checklist" | "missing"
> {
  const missing = REGISTRATION_CHECKLIST_KEYS.filter((key) => !checklist[key]);
  return {
    checklist,
    missing,
    complete: missing.length === 0,
  };
}

async function hasVerificationDocuments(userId: string): Promise<boolean> {
  const count = await db.providerLicenseDocument.count({ where: { userId } });
  return count > 0;
}

export function isProfessionalRegistrationComplete(profile: {
  firstName: string | null;
  lastName: string | null;
  licenseNumber: string | null;
  specialty: string | null;
  consultPrice: number | null;
}): boolean {
  return Boolean(
    profile.firstName?.trim() &&
      profile.lastName?.trim() &&
      profile.licenseNumber?.trim() &&
      profile.specialty?.trim() &&
      (profile.consultPrice ?? 0) > 0,
  );
}

export function isPsychoanalystRegistrationComplete(profile: {
  firstName: string | null;
  lastName: string | null;
  trainingInstitution: string | null;
  consultPrice: number | null;
  personalAnalysisDone: boolean;
  theoreticalStudyDone: boolean;
  clinicalSupervision: boolean;
}): boolean {
  return Boolean(
    profile.firstName?.trim() &&
      profile.lastName?.trim() &&
      profile.trainingInstitution?.trim() &&
      (profile.consultPrice ?? 0) > 0 &&
      profile.personalAnalysisDone &&
      profile.theoreticalStudyDone &&
      profile.clinicalSupervision,
  );
}

export function isIntegrativeTherapistRegistrationComplete(profile: {
  firstName: string | null;
  lastName: string | null;
  trainingInstitution: string | null;
  picsPractices: string[];
  consultPrice: number | null;
}): boolean {
  return Boolean(
    profile.firstName?.trim() &&
      profile.lastName?.trim() &&
      profile.trainingInstitution?.trim() &&
      profile.picsPractices.length > 0 &&
      (profile.consultPrice ?? 0) > 0,
  );
}

export function isAngelRegistrationComplete(profile: {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  profession: string | null;
  volunteerHelp: string | null;
  languages: string[];
}): boolean {
  return Boolean(
    profile.firstName?.trim() &&
      profile.lastName?.trim() &&
      profile.phone?.trim() &&
      profile.profession?.trim() &&
      profile.volunteerHelp?.trim() &&
      profile.languages.length > 0,
  );
}

export function isProviderDashboardAlertRole(role: string | undefined): boolean {
  return (
    role === "PROFESSIONAL" ||
    role === "PSYCHOANALYST" ||
    role === "INTEGRATIVE_THERAPIST" ||
    role === "ANGEL"
  );
}

export async function getProviderRegistrationStatus(
  userId: string,
  role: UserRole | string,
): Promise<ProviderRegistrationStatus | null> {
  if (role === "PROFESSIONAL") {
    const profile = await db.professionalProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        licenseNumber: true,
        specialty: true,
        consultPrice: true,
        verified: true,
      },
    });
    if (!profile) return null;

    const [hasDocuments, availCount, services] = await Promise.all([
      hasVerificationDocuments(userId),
      db.availabilitySlot.count({
        where: { professionalId: profile.id, isActive: true },
      }),
      getProviderServices(profile.id, "health", true),
    ]);

    const professionalData = Boolean(
      profile.firstName?.trim() &&
        profile.lastName?.trim() &&
        profile.licenseNumber?.trim() &&
        profile.specialty?.trim(),
    );
    const hasServices = hasActiveConsultServices(services);
    const careSettings = hasServices && availCount > 0;
    const checklist: RegistrationChecklist = {
      professionalData,
      verificationDocuments: hasDocuments,
      careSettings,
    };

    return {
      verified: profile.verified,
      ...buildChecklistStatus(checklist),
    };
  }

  if (role === "PSYCHOANALYST") {
    const profile = await db.psychoanalystProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        trainingInstitution: true,
        consultPrice: true,
        personalAnalysisDone: true,
        theoreticalStudyDone: true,
        clinicalSupervision: true,
        verified: true,
      },
    });
    if (!profile) return null;

    const hasDocuments = await hasVerificationDocuments(userId);
    const services = await getProviderServices(profile.id, "psychoanalyst", true);
    const professionalData = Boolean(
      profile.firstName?.trim() &&
        profile.lastName?.trim() &&
        profile.trainingInstitution?.trim() &&
        profile.personalAnalysisDone &&
        profile.theoreticalStudyDone &&
        profile.clinicalSupervision,
    );
    const checklist: RegistrationChecklist = {
      professionalData,
      verificationDocuments: hasDocuments,
      careSettings: hasActiveConsultServices(services),
    };

    return {
      verified: profile.verified,
      ...buildChecklistStatus(checklist),
    };
  }

  if (role === "INTEGRATIVE_THERAPIST") {
    const profile = await db.integrativeTherapistProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        trainingInstitution: true,
        picsPractices: true,
        consultPrice: true,
        verified: true,
      },
    });
    if (!profile) return null;

    const hasDocuments = await hasVerificationDocuments(userId);
    const services = await getProviderServices(profile.id, "integrative_therapist", true);
    const professionalData = Boolean(
      profile.firstName?.trim() &&
        profile.lastName?.trim() &&
        profile.trainingInstitution?.trim() &&
        profile.picsPractices.length > 0,
    );
    const checklist: RegistrationChecklist = {
      professionalData,
      verificationDocuments: hasDocuments,
      careSettings: hasActiveConsultServices(services),
    };

    return {
      verified: profile.verified,
      ...buildChecklistStatus(checklist),
    };
  }

  if (role === "ANGEL") {
    const profile = await db.angelProfile.findUnique({
      where: { userId },
      select: {
        firstName: true,
        lastName: true,
        phone: true,
        profession: true,
        volunteerHelp: true,
        languages: true,
        approvalStatus: true,
      },
    });
    if (!profile) return null;

    const hasDocuments = await hasVerificationDocuments(userId);
    const professionalData = Boolean(
      profile.firstName?.trim() &&
        profile.lastName?.trim() &&
        profile.phone?.trim() &&
        profile.profession?.trim() &&
        profile.volunteerHelp?.trim() &&
        profile.languages.length > 0,
    );
    const checklist: RegistrationChecklist = {
      professionalData,
      verificationDocuments: hasDocuments,
      careSettings: true,
    };

    return {
      verified: profile.approvalStatus === "APPROVED",
      ...buildChecklistStatus(checklist),
    };
  }

  return null;
}

export function resolveProviderSettingsHref(
  role: string,
  pathname: string,
): string {
  if (role === "ANGEL") return "/admin/patients";
  if (role === "PSYCHOANALYST") return "/psychoanalyst/settings";
  if (role === "INTEGRATIVE_THERAPIST") return "/integrative-therapist/settings";
  if (pathname.startsWith("/psychologist")) return "/psychologist/settings";
  return "/professional/settings";
}

export function isProviderSettingsPath(pathname: string, role?: string): boolean {
  if (role === "ANGEL") {
    return (
      pathname.startsWith("/admin/patients")
      || pathname.startsWith("/admin/angel")
    );
  }
  return (
    pathname.startsWith("/professional/settings") ||
    pathname.startsWith("/psychologist/settings") ||
    pathname.startsWith("/psychoanalyst/settings") ||
    pathname.startsWith("/integrative-therapist/settings")
  );
}
