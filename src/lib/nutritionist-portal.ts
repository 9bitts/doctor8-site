import { isNutritionistSpecialty } from "@/lib/profession-label";
import { isPsychologistSpecialty } from "@/lib/psychologist-portal";
import { db } from "@/lib/db";

export const NUTRITIONIST_LOGIN = "/login";
export const NUTRITIONIST_HOME = "/nutricionista";
export const NUTRITIONIST_REGISTER =
  "/register/professional/signup?portal=nutritionist&profession=nutricionista";

export type ProfessionalPortalBase = "/nutricionista" | "/professional" | "/psychologist";

/** Longest-prefix map from /professional/* to /nutricionista/* (order matters). */
export const PROFESSIONAL_TO_NUTRITIONIST_PATHS: [string, string][] = [
  ["/professional/settings/availability", "/nutricionista/settings/availability"],
  ["/professional/settings", "/nutricionista/settings"],
  ["/professional/patients", "/nutricionista/patients"],
  ["/professional/shared", "/nutricionista/shared"],
  ["/professional/categories", "/nutricionista/categories"],
  ["/professional/appointments", "/nutricionista/appointments"],
  ["/professional/resources", "/nutricionista/resources"],
  ["/professional/financeiro", "/nutricionista/financeiro"],
  ["/professional/messages", "/nutricionista/messages"],
  ["/professional/account", "/nutricionista/account"],
  ["/professional/meeting-rooms", "/nutricionista/meeting-rooms"],
  ["/professional", "/nutricionista"],
];

function mapProfessionalPathToNutritionist(professionalPath: string): string {
  for (const [from, to] of PROFESSIONAL_TO_NUTRITIONIST_PATHS) {
    if (professionalPath === from || professionalPath.startsWith(`${from}/`)) {
      return professionalPath.replace(from, to);
    }
  }
  return "/nutricionista";
}

export function nutritionistPortalBase(pathname: string): "/nutricionista" | "/professional" {
  return pathname.startsWith("/nutricionista") ? "/nutricionista" : "/professional";
}

export function nutritionistPatientsHref(pathname: string, chartId: string): string {
  return `${nutritionistPortalBase(pathname)}/patients/${chartId}`;
}

export function mapProfessionalPathToNutritionistPortal(
  pathname: string,
  professionalPath: string,
): string {
  if (!professionalPath.startsWith("/professional")) return professionalPath;
  if (nutritionistPortalBase(pathname) === "/nutricionista") {
    return mapProfessionalPathToNutritionist(professionalPath);
  }
  return professionalPath;
}

export async function resolveNutritionistPortalBaseForUser(
  userId: string,
): Promise<"/nutricionista" | "/professional"> {
  const profile = await db.professionalProfile.findUnique({
    where: { userId },
    select: { specialty: true },
  });
  return profile && isNutritionistSpecialty(profile.specialty)
    ? "/nutricionista"
    : "/professional";
}

export function mapProfessionalPathForNutritionistSpecialty(
  specialty: string | null | undefined,
  professionalPath: string,
): string {
  if (!professionalPath.startsWith("/professional")) return professionalPath;
  if (!isNutritionistSpecialty(specialty)) return professionalPath;
  return mapProfessionalPathToNutritionist(professionalPath);
}

/** Resolves /psychologist, /nutricionista or /professional from profile specialty. */
export async function resolveHealthProfessionalPortalBaseForUser(
  userId: string,
): Promise<"/psychologist" | "/nutricionista" | "/professional"> {
  const profile = await db.professionalProfile.findUnique({
    where: { userId },
    select: { specialty: true },
  });
  if (!profile) return "/professional";
  if (isPsychologistSpecialty(profile.specialty)) return "/psychologist";
  if (isNutritionistSpecialty(profile.specialty)) return "/nutricionista";
  return "/professional";
}
