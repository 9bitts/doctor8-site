import type { UserRole } from "@prisma/client";

const PROFESSIONAL_ROLES: UserRole[] = [
  "PROFESSIONAL",
  "PSYCHOANALYST",
  "INTEGRATIVE_THERAPIST",
];

const PROFILE_EXEMPT_ROLES = new Set<string>(["ADMIN", "ANGEL", "ORGANIZATION"]);

export type UserProfileSnapshot = {
  role: UserRole | string;
  patientProfile?: unknown | null;
  professionalProfile?: unknown | null;
  psychoanalystProfile?: unknown | null;
  integrativeTherapistProfile?: unknown | null;
};

export function isProfileExemptRole(role: string | undefined | null): boolean {
  return !!role && PROFILE_EXEMPT_ROLES.has(role);
}

export function userHasAnyProfile(user: UserProfileSnapshot): boolean {
  return !!(
    user.patientProfile ||
    user.professionalProfile ||
    user.psychoanalystProfile ||
    user.integrativeTherapistProfile
  );
}

export function userHasProfileForRole(user: UserProfileSnapshot): boolean {
  switch (user.role) {
    case "PATIENT":
      return !!user.patientProfile;
    case "PROFESSIONAL":
      return !!user.professionalProfile;
    case "PSYCHOANALYST":
      return !!user.psychoanalystProfile;
    case "INTEGRATIVE_THERAPIST":
      return !!user.integrativeTherapistProfile;
    default:
      return true;
  }
}

/** Professional roles missing their corresponding profile table row. */
export function isIncompleteProfessionalSignup(user: UserProfileSnapshot): boolean {
  if (!PROFESSIONAL_ROLES.includes(user.role as UserRole)) return false;
  return !userHasProfileForRole(user);
}

/** True when the account must finish signup before accessing dashboards. */
export function accountNeedsProfileCompletion(user: UserProfileSnapshot): boolean {
  if (isProfileExemptRole(user.role)) return false;
  return !userHasProfileForRole(user);
}

/** Inverse of accountNeedsProfileCompletion ? used as JWT claim. */
export function computeProfileComplete(user: UserProfileSnapshot): boolean {
  return !accountNeedsProfileCompletion(user);
}

/** Edge-safe: read profile completeness from session/JWT claim only. */
export function sessionProfileIncomplete(user: {
  role?: string | null;
  profileComplete?: boolean;
}): boolean {
  if (isProfileExemptRole(user.role)) return false;
  return user.profileComplete === false;
}
