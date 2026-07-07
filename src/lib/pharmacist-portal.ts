import { isPharmacistSpecialty } from "@/lib/profession-label";
import { db } from "@/lib/db";

export const PHARMACIST_LOGIN = "/login";
export const PHARMACIST_HOME = "/farmaceutico";
export const PHARMACIST_REGISTER =
  "/register/professional/signup?portal=pharmacist&profession=farmaceutico";

export const PROFESSIONAL_TO_PHARMACIST_PATHS: [string, string][] = [
  ["/professional/settings/availability", "/farmaceutico/settings/availability"],
  ["/professional/settings", "/farmaceutico/settings"],
  ["/professional/patients", "/farmaceutico/patients"],
  ["/professional/shared", "/farmaceutico/shared"],
  ["/professional/categories", "/farmaceutico/categories"],
  ["/professional/appointments", "/farmaceutico/appointments"],
  ["/professional/resources", "/farmaceutico/resources"],
  ["/professional/financeiro", "/farmaceutico/financeiro"],
  ["/professional/messages", "/farmaceutico/messages"],
  ["/professional/account", "/farmaceutico/account"],
  ["/professional/meeting-rooms", "/farmaceutico/meeting-rooms"],
  ["/professional", "/farmaceutico"],
];

function mapProfessionalPathToPharmacist(professionalPath: string): string {
  for (const [from, to] of PROFESSIONAL_TO_PHARMACIST_PATHS) {
    if (professionalPath === from || professionalPath.startsWith(`${from}/`)) {
      return professionalPath.replace(from, to);
    }
  }
  return "/farmaceutico";
}

export function pharmacistPortalBase(pathname: string): "/farmaceutico" | "/professional" {
  return pathname.startsWith("/farmaceutico") ? "/farmaceutico" : "/professional";
}

export function pharmacistPatientsHref(pathname: string, chartId: string): string {
  return `${pharmacistPortalBase(pathname)}/patients/${chartId}`;
}

export function mapProfessionalPathToPharmacistPortal(
  pathname: string,
  professionalPath: string,
): string {
  if (!professionalPath.startsWith("/professional")) return professionalPath;
  if (pharmacistPortalBase(pathname) === "/farmaceutico") {
    return mapProfessionalPathToPharmacist(professionalPath);
  }
  return professionalPath;
}

export async function resolvePharmacistPortalBaseForUser(
  userId: string,
): Promise<"/farmaceutico" | "/professional"> {
  const profile = await db.professionalProfile.findUnique({
    where: { userId },
    select: { specialty: true },
  });
  return profile && isPharmacistSpecialty(profile.specialty) ? "/farmaceutico" : "/professional";
}

export function mapProfessionalPathForPharmacistSpecialty(
  specialty: string | null | undefined,
  professionalPath: string,
): string {
  if (!professionalPath.startsWith("/professional")) return professionalPath;
  if (!isPharmacistSpecialty(specialty)) return professionalPath;
  return mapProfessionalPathToPharmacist(professionalPath);
}
