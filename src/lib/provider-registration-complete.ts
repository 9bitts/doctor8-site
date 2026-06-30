import { db } from "@/lib/db";
import type { UserRole } from "@prisma/client";

export type ProviderRegistrationStatus = {
  complete: boolean;
  verified: boolean;
};

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
        firstName: true,
        lastName: true,
        licenseNumber: true,
        specialty: true,
        consultPrice: true,
        verified: true,
      },
    });
    if (!profile) return null;
    return {
      complete: isProfessionalRegistrationComplete(profile),
      verified: profile.verified,
    };
  }

  if (role === "PSYCHOANALYST") {
    const profile = await db.psychoanalystProfile.findUnique({
      where: { userId },
      select: {
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
    return {
      complete: isPsychoanalystRegistrationComplete(profile),
      verified: profile.verified,
    };
  }

  if (role === "INTEGRATIVE_THERAPIST") {
    const profile = await db.integrativeTherapistProfile.findUnique({
      where: { userId },
      select: {
        firstName: true,
        lastName: true,
        trainingInstitution: true,
        picsPractices: true,
        consultPrice: true,
        verified: true,
      },
    });
    if (!profile) return null;
    return {
      complete: isIntegrativeTherapistRegistrationComplete(profile),
      verified: profile.verified,
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
    return {
      complete: isAngelRegistrationComplete(profile),
      verified: profile.approvalStatus === "APPROVED",
    };
  }

  return null;
}

export function resolveProviderSettingsHref(
  role: string,
  pathname: string,
): string {
  if (role === "ANGEL") return "/humanitarian/angel";
  if (role === "PSYCHOANALYST") return "/psychoanalyst/settings";
  if (role === "INTEGRATIVE_THERAPIST") return "/integrative-therapist/settings";
  if (pathname.startsWith("/psychologist")) return "/psychologist/settings";
  return "/professional/settings";
}

export function isProviderSettingsPath(pathname: string, role?: string): boolean {
  if (role === "ANGEL") return false;
  return (
    pathname.startsWith("/professional/settings") ||
    pathname.startsWith("/psychologist/settings") ||
    pathname.startsWith("/psychoanalyst/settings") ||
    pathname.startsWith("/integrative-therapist/settings")
  );
}
