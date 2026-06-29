import { isPsychologist } from "@/lib/profession-label";
import { db } from "@/lib/db";

export const PSYCHOLOGIST_LOGIN = "/login/psicologo";
export const PSYCHOLOGIST_HOME = "/psychologist";
export const PSYCHOLOGIST_REGISTER =
  "/register/professional/signup?portal=psychologist";

export type ProfessionalPortalBase = "/psychologist" | "/professional";

/** True when specialty is a psychology profession (includes onboarding value "Psychology"). */
export function isPsychologistSpecialty(
  specialty: string | null | undefined,
): boolean {
  if (!specialty?.trim()) return false;
  const s = specialty.trim();
  if (s === "Psychology") return true;
  return isPsychologist(s);
}

export function professionalPortalBase(pathname: string): ProfessionalPortalBase {
  return pathname.startsWith("/psychologist") ? "/psychologist" : "/professional";
}

export function professionalPatientsHref(pathname: string, chartId: string): string {
  return `${professionalPortalBase(pathname)}/patients/${chartId}`;
}

/** Rewrites a /professional/... path to the portal matching the current URL. */
export function mapProfessionalPathToPortal(
  pathname: string,
  professionalPath: string,
): string {
  if (!professionalPath.startsWith("/professional")) return professionalPath;
  return professionalPath.replace("/professional", professionalPortalBase(pathname));
}

export async function resolveProfessionalPortalBaseForUser(
  userId: string,
): Promise<ProfessionalPortalBase> {
  const profile = await db.professionalProfile.findUnique({
    where: { userId },
    select: { specialty: true },
  });
  return profile && isPsychologistSpecialty(profile.specialty)
    ? "/psychologist"
    : "/professional";
}

export function professionalPortalBaseFromSpecialty(
  specialty: string | null | undefined,
): ProfessionalPortalBase {
  return isPsychologistSpecialty(specialty) ? "/psychologist" : "/professional";
}

/** Rewrites /professional/* paths to the portal for this specialty (or keeps path). */
export function mapProfessionalPathForSpecialty(
  specialty: string | null | undefined,
  professionalPath: string,
): string {
  const base = professionalPortalBaseFromSpecialty(specialty);
  if (base === "/professional" || !professionalPath.startsWith("/professional")) {
    return professionalPath;
  }
  return professionalPath.replace("/professional", base);
}

export function psychologistHubHref(pathname: string): string {
  return pathname.startsWith("/psychologist")
    ? PSYCHOLOGIST_HOME
    : "/professional/psychology";
}
