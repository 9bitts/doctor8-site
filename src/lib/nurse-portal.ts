import { isNurseSpecialty } from "@/lib/profession-label";
import { db } from "@/lib/db";

export const NURSE_LOGIN = "/login";
export const NURSE_HOME = "/enfermeiro";
export const NURSE_REGISTER =
  "/register/professional/signup?portal=nurse&profession=enfermeiro";

export const PROFESSIONAL_TO_NURSE_PATHS: [string, string][] = [
  ["/professional/settings/availability", "/enfermeiro/settings/availability"],
  ["/professional/settings", "/enfermeiro/settings"],
  ["/professional/patients", "/enfermeiro/patients"],
  ["/professional/shared", "/enfermeiro/shared"],
  ["/professional/categories", "/enfermeiro/categories"],
  ["/professional/appointments", "/enfermeiro/appointments"],
  ["/professional/resources", "/enfermeiro/resources"],
  ["/professional/financeiro", "/enfermeiro/financeiro"],
  ["/professional/messages", "/enfermeiro/messages"],
  ["/professional/account", "/enfermeiro/account"],
  ["/professional/meeting-rooms", "/enfermeiro/meeting-rooms"],
  ["/professional", "/enfermeiro"],
];

function mapProfessionalPathToNurse(professionalPath: string): string {
  for (const [from, to] of PROFESSIONAL_TO_NURSE_PATHS) {
    if (professionalPath === from || professionalPath.startsWith(`${from}/`)) {
      return professionalPath.replace(from, to);
    }
  }
  return "/enfermeiro";
}

export function nursePortalBase(pathname: string): "/enfermeiro" | "/professional" {
  return pathname.startsWith("/enfermeiro") ? "/enfermeiro" : "/professional";
}

export function nursePatientsHref(pathname: string, chartId: string): string {
  return `${nursePortalBase(pathname)}/patients/${chartId}`;
}

export function mapProfessionalPathToNursePortal(
  pathname: string,
  professionalPath: string,
): string {
  if (!professionalPath.startsWith("/professional")) return professionalPath;
  if (nursePortalBase(pathname) === "/enfermeiro") {
    return mapProfessionalPathToNurse(professionalPath);
  }
  return professionalPath;
}

export async function resolveNursePortalBaseForUser(
  userId: string,
): Promise<"/enfermeiro" | "/professional"> {
  const profile = await db.professionalProfile.findUnique({
    where: { userId },
    select: { specialty: true },
  });
  return profile && isNurseSpecialty(profile.specialty) ? "/enfermeiro" : "/professional";
}

export function mapProfessionalPathForNurseSpecialty(
  specialty: string | null | undefined,
  professionalPath: string,
): string {
  if (!professionalPath.startsWith("/professional")) return professionalPath;
  if (!isNurseSpecialty(specialty)) return professionalPath;
  return mapProfessionalPathToNurse(professionalPath);
}
