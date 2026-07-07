import { isDentistSpecialty } from "@/lib/profession-label";
import { db } from "@/lib/db";

export const DENTIST_LOGIN = "/login";
export const DENTIST_HOME = "/odontologo";
export const DENTIST_REGISTER =
  "/register/professional/signup?portal=dentist&profession=dentista";

export const PROFESSIONAL_TO_DENTIST_PATHS: [string, string][] = [
  ["/professional/settings/availability", "/odontologo/settings/availability"],
  ["/professional/settings", "/odontologo/settings"],
  ["/professional/patients", "/odontologo/patients"],
  ["/professional/shared", "/odontologo/shared"],
  ["/professional/categories", "/odontologo/categories"],
  ["/professional/appointments", "/odontologo/appointments"],
  ["/professional/prescriptions", "/odontologo/prescriptions"],
  ["/professional/resources", "/odontologo/resources"],
  ["/professional/financeiro", "/odontologo/financeiro"],
  ["/professional/messages", "/odontologo/messages"],
  ["/professional/account", "/odontologo/account"],
  ["/professional/meeting-rooms", "/odontologo/meeting-rooms"],
  ["/professional/jit", "/odontologo/jit"],
  ["/professional", "/odontologo"],
];

function mapProfessionalPathToDentist(professionalPath: string): string {
  for (const [from, to] of PROFESSIONAL_TO_DENTIST_PATHS) {
    if (professionalPath === from || professionalPath.startsWith(`${from}/`)) {
      return professionalPath.replace(from, to);
    }
  }
  return "/odontologo";
}

export function dentistPortalBase(pathname: string): "/odontologo" | "/professional" {
  return pathname.startsWith("/odontologo") ? "/odontologo" : "/professional";
}

export function dentistPatientsHref(pathname: string, chartId: string): string {
  return `${dentistPortalBase(pathname)}/patients/${chartId}`;
}

export function mapProfessionalPathToDentistPortal(
  pathname: string,
  professionalPath: string,
): string {
  if (!professionalPath.startsWith("/professional")) return professionalPath;
  if (dentistPortalBase(pathname) === "/odontologo") {
    return mapProfessionalPathToDentist(professionalPath);
  }
  return professionalPath;
}

export async function resolveDentistPortalBaseForUser(
  userId: string,
): Promise<"/odontologo" | "/professional"> {
  const profile = await db.professionalProfile.findUnique({
    where: { userId },
    select: { specialty: true },
  });
  return profile && isDentistSpecialty(profile.specialty) ? "/odontologo" : "/professional";
}

export function mapProfessionalPathForDentistSpecialty(
  specialty: string | null | undefined,
  professionalPath: string,
): string {
  if (!professionalPath.startsWith("/professional")) return professionalPath;
  if (!isDentistSpecialty(specialty)) return professionalPath;
  return mapProfessionalPathToDentist(professionalPath);
}
