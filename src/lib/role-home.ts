import {
  isPsychologistSpecialty,
  mapProfessionalPathForSpecialty,
  PSYCHOLOGIST_HOME,
} from "./psychologist-portal";
import {
  mapProfessionalPathForNutritionistSpecialty,
  NUTRITIONIST_HOME,
} from "./nutritionist-portal";
import { mapProfessionalPathForNurseSpecialty, NURSE_HOME } from "./nurse-portal";
import {
  mapProfessionalPathForPharmacistSpecialty,
  PHARMACIST_HOME,
} from "./pharmacist-portal";
import { mapProfessionalPathForDentistSpecialty, DENTIST_HOME } from "./dentist-portal";
import { isNutritionistSpecialty, isNurseSpecialty, isPharmacistSpecialty, isDentistSpecialty } from "./profession-label";
import { isHumanitarianPatientPath } from "./humanitarian/origin-cookie";
import { resolvePatientRoleHome } from "./humanitarian/patient-identity";

export type RoleHomeOptions = {
  humanitarianPatient?: boolean;
};

/** Default dashboard path after login for each account role. */
export function resolveRoleHome(
  role: string | undefined | null,
  specialty?: string | null,
  options?: RoleHomeOptions,
): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "PROFESSIONAL":
      if (isPsychologistSpecialty(specialty)) return PSYCHOLOGIST_HOME;
      if (isNutritionistSpecialty(specialty)) return NUTRITIONIST_HOME;
      if (isNurseSpecialty(specialty)) return NURSE_HOME;
      if (isPharmacistSpecialty(specialty)) return PHARMACIST_HOME;
      if (isDentistSpecialty(specialty)) return DENTIST_HOME;
      return "/professional";
    case "PSYCHOANALYST":
      return "/psychoanalyst";
    case "INTEGRATIVE_THERAPIST":
      return "/integrative-therapist";
    case "ORGANIZATION":
      return "/organization";
    case "EMPLOYER":
      return "/empresas/painel";
    case "PHARMACY_STORE":
      return "/farmacias/painel";
    case "LABORATORY":
      return "/laboratorios/painel";
    case "OCCUPATIONAL_PHYSICIAN":
      return "/empresas/medico/painel";
    case "ANGEL":
      return "/admin/angel";
    case "PATIENT":
      return resolvePatientRoleHome({ humanitarianPatient: options?.humanitarianPatient });
    default:
      return "/patient";
  }
}

const ROLE_ROUTE_CHECKS: { prefix: string; roles: string[] }[] = [
  { prefix: "/admin/patients", roles: ["ADMIN"] },
  { prefix: "/admin/angel", roles: ["ADMIN", "ANGEL"] },
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/professional", roles: ["PROFESSIONAL", "ADMIN"] },
  { prefix: "/psychologist", roles: ["PROFESSIONAL", "ADMIN"] },
  { prefix: "/nutricionista", roles: ["PROFESSIONAL", "ADMIN"] },
  { prefix: "/enfermeiro", roles: ["PROFESSIONAL", "ADMIN"] },
  { prefix: "/farmaceutico", roles: ["PROFESSIONAL", "ADMIN"] },
  { prefix: "/odontologo", roles: ["PROFESSIONAL", "ADMIN"] },
  { prefix: "/psychoanalyst", roles: ["PSYCHOANALYST", "ADMIN"] },
  { prefix: "/integrative-therapist", roles: ["INTEGRATIVE_THERAPIST", "ADMIN"] },
  { prefix: "/patient", roles: ["PATIENT", "ADMIN"] },
  { prefix: "/organization", roles: ["ORGANIZATION", "ADMIN"] },
  { prefix: "/empresas/painel", roles: ["EMPLOYER", "ADMIN"] },
  { prefix: "/empresas/nr1", roles: ["EMPLOYER", "ADMIN"] },
  { prefix: "/empresas/aep", roles: ["EMPLOYER", "ADMIN"] },
  { prefix: "/empresas/plano-acao", roles: ["EMPLOYER", "ADMIN"] },
  { prefix: "/empresas/pesquisas", roles: ["EMPLOYER", "ADMIN"] },
  { prefix: "/empresas/colaboradores", roles: ["EMPLOYER", "ADMIN"] },
  { prefix: "/empresas/eap", roles: ["EMPLOYER", "ADMIN"] },
  { prefix: "/empresas/equipe", roles: ["EMPLOYER", "ADMIN"] },
  { prefix: "/empresas/documentacao", roles: ["EMPLOYER", "ADMIN"] },
  { prefix: "/empresas/pcmso", roles: ["EMPLOYER", "ADMIN"] },
  { prefix: "/empresas/configuracoes", roles: ["EMPLOYER", "ADMIN"] },
  { prefix: "/empresas/denuncias", roles: ["EMPLOYER", "ADMIN"] },
  { prefix: "/empresas/rede-psicologos", roles: ["EMPLOYER", "ADMIN"] },
  { prefix: "/empresas/aep", roles: ["EMPLOYER", "ADMIN"] },
  { prefix: "/empresas/colaborador", roles: ["PATIENT", "ADMIN"] },
  { prefix: "/empresas/medico/painel", roles: ["OCCUPATIONAL_PHYSICIAN", "ADMIN"] },
  { prefix: "/empresas/medico/empresas", roles: ["OCCUPATIONAL_PHYSICIAN", "ADMIN"] },
  { prefix: "/farmacias/painel", roles: ["PHARMACY_STORE", "ADMIN"] },
  { prefix: "/farmacias/estoque", roles: ["PHARMACY_STORE", "ADMIN"] },
  { prefix: "/farmacias/pedidos", roles: ["PHARMACY_STORE", "ADMIN"] },
  { prefix: "/farmacias/configuracoes", roles: ["PHARMACY_STORE", "ADMIN"] },
  { prefix: "/farmacias/farmaceutico/painel", roles: ["PROFESSIONAL", "ADMIN"] },
  { prefix: "/laboratorios/painel", roles: ["LABORATORY", "ADMIN"] },
  { prefix: "/laboratorios/exames", roles: ["LABORATORY", "ADMIN"] },
  { prefix: "/laboratorios/configuracoes", roles: ["LABORATORY", "ADMIN"] },
  { prefix: "/humanitarian/painel", roles: ["PATIENT", "ADMIN"] },
  { prefix: "/humanitarian/angel", roles: ["ANGEL", "ADMIN"] },
  {
    prefix: "/humanitarian/volunteer",
    roles: ["PROFESSIONAL", "PSYCHOANALYST", "INTEGRATIVE_THERAPIST", "ADMIN"],
  },
];

/** Whether an authenticated user may open this path (role-prefixed areas only). */
export function isPathAllowedForRole(
  pathname: string,
  role: string | undefined | null,
): boolean {
  if (!role) return false;
  if (role === "ADMIN") return true;

  for (const { prefix, roles } of ROLE_ROUTE_CHECKS) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return roles.includes(role);
    }
  }

  // onboarding, video, account settings, etc.
  return true;
}

/** Auth bootstrap routes — never use as a post-login destination (avoids /callback loops). */
function isAuthBootstrapPath(pathname: string): boolean {
  return (
    pathname === "/callback" ||
    pathname.startsWith("/callback/") ||
    pathname === "/login" ||
    pathname.startsWith("/login/")
  );
}

export type SafePostLoginOptions = {
  /** When true, callback came from humanitarian return cookie — only patients should follow it. */
  fromHumCookie?: boolean;
  humanitarianPatient?: boolean;
};

/** Post-login destination: honor deep links only when the role may access them. */
export function safePostLoginUrl(
  role: string | undefined | null,
  callbackUrl: string | null | undefined,
  resolvePatientUrl?: (
    url: string,
    options?: { humanitarianPatient?: boolean },
  ) => string,
  specialty?: string | null,
  options?: SafePostLoginOptions,
): string {
  const home = resolveRoleHome(role, specialty, {
    humanitarianPatient: options?.humanitarianPatient,
  });
  const raw = callbackUrl?.trim();
  if (options?.fromHumCookie && role !== "PATIENT") return home;
  if (!raw) return home;

  let path = raw;
  try {
    const url = new URL(raw, "https://doctor8.org");
    path = url.pathname + url.search;
  } catch {
    if (!raw.startsWith("/")) return home;
    path = raw;
  }

  const pathname = path.split("?")[0];
  if (isAuthBootstrapPath(pathname)) return home;

  if (
    role !== "PATIENT"
    && role !== "ADMIN"
    && isHumanitarianPatientPath(pathname)
  ) {
    return home;
  }

  if (role === "PATIENT" && resolvePatientUrl) {
    const patientPath = resolvePatientUrl(path, {
      humanitarianPatient: options?.humanitarianPatient,
    });
    const patientPathname = patientPath.split("?")[0];
    if (isPathAllowedForRole(patientPathname, role)) return patientPath;
    return home;
  }

  if (isPathAllowedForRole(pathname, role)) {
    if (role === "PROFESSIONAL" && isPsychologistSpecialty(specialty)) {
      return mapProfessionalPathForSpecialty(specialty, path.startsWith("/") ? path : `/${path}`);
    }
    if (role === "PROFESSIONAL" && isNutritionistSpecialty(specialty)) {
      return mapProfessionalPathForNutritionistSpecialty(
        specialty,
        path.startsWith("/") ? path : `/${path}`,
      );
    }
    if (role === "PROFESSIONAL" && isNurseSpecialty(specialty)) {
      return mapProfessionalPathForNurseSpecialty(
        specialty,
        path.startsWith("/") ? path : `/${path}`,
      );
    }
    if (role === "PROFESSIONAL" && isPharmacistSpecialty(specialty)) {
      return mapProfessionalPathForPharmacistSpecialty(
        specialty,
        path.startsWith("/") ? path : `/${path}`,
      );
    }
    if (role === "PROFESSIONAL" && isDentistSpecialty(specialty)) {
      return mapProfessionalPathForDentistSpecialty(
        specialty,
        path.startsWith("/") ? path : `/${path}`,
      );
    }
    return path.startsWith("/") ? path : `/${path}`;
  }

  return home;
}
