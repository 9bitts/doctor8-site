import {
  isPsychologistSpecialty,
  mapProfessionalPathForSpecialty,
  PSYCHOLOGIST_HOME,
} from "./psychologist-portal";

/** Default dashboard path after login for each account role. */
export function resolveRoleHome(
  role: string | undefined | null,
  specialty?: string | null,
): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "PROFESSIONAL":
      return isPsychologistSpecialty(specialty) ? PSYCHOLOGIST_HOME : "/professional";
    case "PSYCHOANALYST":
      return "/psychoanalyst";
    case "INTEGRATIVE_THERAPIST":
      return "/integrative-therapist";
    case "ORGANIZATION":
      return "/organization";
    case "ANGEL":
      return "/humanitarian/angel";
    case "PATIENT":
    default:
      return "/patient";
  }
}

const ROLE_ROUTE_CHECKS: { prefix: string; roles: string[] }[] = [
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/professional", roles: ["PROFESSIONAL", "ADMIN"] },
  { prefix: "/psychologist", roles: ["PROFESSIONAL", "ADMIN"] },
  { prefix: "/psychoanalyst", roles: ["PSYCHOANALYST", "ADMIN"] },
  { prefix: "/integrative-therapist", roles: ["INTEGRATIVE_THERAPIST", "ADMIN"] },
  { prefix: "/patient", roles: ["PATIENT", "ADMIN"] },
  { prefix: "/organization", roles: ["ORGANIZATION", "ADMIN"] },
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

/** Post-login destination: honor deep links only when the role may access them. */
export function safePostLoginUrl(
  role: string | undefined | null,
  callbackUrl: string | null | undefined,
  resolvePatientUrl?: (url: string) => string,
  specialty?: string | null,
): string {
  const home = resolveRoleHome(role, specialty);
  const raw = callbackUrl?.trim();
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

  if (role === "PATIENT" && resolvePatientUrl) {
    const patientPath = resolvePatientUrl(path);
    const patientPathname = patientPath.split("?")[0];
    if (isPathAllowedForRole(patientPathname, role)) return patientPath;
    return home;
  }

  if (isPathAllowedForRole(pathname, role)) {
    if (role === "PROFESSIONAL" && isPsychologistSpecialty(specialty)) {
      return mapProfessionalPathForSpecialty(specialty, path.startsWith("/") ? path : `/${path}`);
    }
    return path.startsWith("/") ? path : `/${path}`;
  }

  return home;
}
