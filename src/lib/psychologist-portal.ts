import {
  isPsychologist,
  isNutritionistSpecialty,
  isNurseSpecialty,
  isPharmacistSpecialty,
  isDentistSpecialty,
} from "@/lib/profession-label";
import { db } from "@/lib/db";
import { nursePortalBase, mapProfessionalPathToNursePortal } from "@/lib/nurse-portal";
import { nutritionistPortalBase, mapProfessionalPathToNutritionistPortal } from "@/lib/nutritionist-portal";
import { pharmacistPortalBase, mapProfessionalPathToPharmacistPortal } from "@/lib/pharmacist-portal";
import {
  dentistPortalBase,
  mapProfessionalPathToDentistPortal,
  mapProfessionalPathForDentistSpecialty,
} from "@/lib/dentist-portal";
import { mapProfessionalPathForNutritionistSpecialty } from "@/lib/nutritionist-portal";
import { mapProfessionalPathForNurseSpecialty } from "@/lib/nurse-portal";
import { mapProfessionalPathForPharmacistSpecialty } from "@/lib/pharmacist-portal";

export const PSYCHOLOGIST_LOGIN = "/login";
export const PSYCHOLOGIST_HOME = "/psychologist";
export const PSYCHOLOGIST_REGISTER =
  "/register/professional/signup?portal=psychologist";

export type ProfessionalPortalBase =
  | "/psychologist"
  | "/nutricionista"
  | "/enfermeiro"
  | "/farmaceutico"
  | "/odontologo"
  | "/professional";

/** Longest-prefix map from /professional/* to /psychologist/* (order matters). */
export const PROFESSIONAL_TO_PSYCHOLOGIST_PATHS: [string, string][] = [
  ["/professional/psychology/compliance", "/psychologist/compliance"],
  ["/professional/psychology/documents", "/psychologist/documents"],
  ["/professional/psychology/scales", "/psychologist/scales"],
  ["/professional/psychology/sessions", "/psychologist/sessions"],
  ["/professional/psychology", "/psychologist"],
  ["/professional/como-usar", "/psychologist/como-usar"],
  ["/professional/settings/availability", "/psychologist/settings/availability"],
  ["/professional/settings", "/psychologist/settings"],
  ["/professional/patients", "/psychologist/patients"],
  ["/professional/shared", "/psychologist/shared"],
  ["/professional/categories", "/psychologist/categories"],
  ["/professional/appointments", "/psychologist/appointments"],
  ["/professional/resources", "/psychologist/resources"],
  ["/professional/financeiro", "/psychologist/financeiro"],
  ["/professional/messages", "/psychologist/messages"],
  ["/professional/account", "/psychologist/account"],
  ["/professional/doctor-connection", "/psychologist/doctor-connection"],
  ["/professional/jit", "/psychologist/jit"],
  ["/professional/meeting-rooms", "/psychologist/meeting-rooms"],
  ["/professional", "/psychologist"],
];

function mapProfessionalPathToPsychologist(professionalPath: string): string {
  for (const [from, to] of PROFESSIONAL_TO_PSYCHOLOGIST_PATHS) {
    if (professionalPath === from || professionalPath.startsWith(`${from}/`)) {
      return professionalPath.replace(from, to);
    }
  }
  return "/psychologist";
}

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
  if (pathname.startsWith("/psychologist")) return "/psychologist";
  if (pathname.startsWith("/nutricionista")) return "/nutricionista";
  if (pathname.startsWith("/enfermeiro")) return "/enfermeiro";
  if (pathname.startsWith("/farmaceutico")) return "/farmaceutico";
  if (pathname.startsWith("/odontologo")) return "/odontologo";
  return "/professional";
}

export function professionalPatientsHref(pathname: string, chartId: string): string {
  return `${professionalPortalBase(pathname)}/patients/${chartId}`;
}

/** Patients list page for the portal matching the current URL. */
export function professionalPatientsListHref(pathname: string): string {
  if (pathname.startsWith("/psychologist")) return "/psychologist/patients";
  if (pathname.startsWith("/nutricionista")) return "/nutricionista/patients";
  if (pathname.startsWith("/enfermeiro")) return "/enfermeiro/patients";
  if (pathname.startsWith("/farmaceutico")) return "/farmaceutico/patients";
  if (pathname.startsWith("/odontologo")) return "/odontologo/patients";
  if (pathname.startsWith("/integrative-therapist")) return "/integrative-therapist/clients";
  return "/professional/patients";
}

/** Rewrites a /professional/... path to the portal matching the current URL. */
export function mapProfessionalPathToPortal(
  pathname: string,
  professionalPath: string,
): string {
  if (!professionalPath.startsWith("/professional")) return professionalPath;
  if (professionalPortalBase(pathname) === "/psychologist") {
    return mapProfessionalPathToPsychologist(professionalPath);
  }
  if (nursePortalBase(pathname) === "/enfermeiro") {
    return mapProfessionalPathToNursePortal(pathname, professionalPath);
  }
  if (nutritionistPortalBase(pathname) === "/nutricionista") {
    return mapProfessionalPathToNutritionistPortal(pathname, professionalPath);
  }
  if (pharmacistPortalBase(pathname) === "/farmaceutico") {
    return mapProfessionalPathToPharmacistPortal(pathname, professionalPath);
  }
  if (dentistPortalBase(pathname) === "/odontologo") {
    return mapProfessionalPathToDentistPortal(pathname, professionalPath);
  }
  return professionalPath;
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
  if (isPsychologistSpecialty(specialty)) return "/psychologist";
  if (isNutritionistSpecialty(specialty)) return "/nutricionista";
  if (isNurseSpecialty(specialty)) return "/enfermeiro";
  if (isPharmacistSpecialty(specialty)) return "/farmaceutico";
  if (isDentistSpecialty(specialty)) return "/odontologo";
  return "/professional";
}

/** Rewrites /professional/* paths to the portal for this specialty (or keeps path). */
export function mapProfessionalPathForSpecialty(
  specialty: string | null | undefined,
  professionalPath: string,
): string {
  if (!professionalPath.startsWith("/professional")) return professionalPath;
  if (isPsychologistSpecialty(specialty)) return mapProfessionalPathToPsychologist(professionalPath);
  if (isNutritionistSpecialty(specialty)) return mapProfessionalPathForNutritionistSpecialty(specialty, professionalPath);
  if (isNurseSpecialty(specialty)) return mapProfessionalPathForNurseSpecialty(specialty, professionalPath);
  if (isPharmacistSpecialty(specialty)) return mapProfessionalPathForPharmacistSpecialty(specialty, professionalPath);
  if (isDentistSpecialty(specialty)) return mapProfessionalPathForDentistSpecialty(specialty, professionalPath);
  return professionalPath;
}

export function psychologistHubHref(pathname: string): string {
  return pathname.startsWith("/psychologist")
    ? PSYCHOLOGIST_HOME
    : "/professional/psychology";
}
