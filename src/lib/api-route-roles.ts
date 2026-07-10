// API path prefix → roles allowed (defense in depth; handlers still enforce ownership).
// ADMIN always passes. Unlisted /api/* paths are not role-gated here.

import { isPatientAdminPath } from "@/lib/admin";

type ApiRoleRule = { prefix: string; roles: readonly string[] };

const API_ROLE_RULES: ApiRoleRule[] = [
  { prefix: "/api/patient", roles: ["PATIENT", "ADMIN"] },
  { prefix: "/api/professional", roles: ["PROFESSIONAL", "ADMIN"] },
  { prefix: "/api/psychologist", roles: ["PROFESSIONAL", "ADMIN"] },
  { prefix: "/api/psychoanalyst", roles: ["PSYCHOANALYST", "ADMIN"] },
  { prefix: "/api/integrative-therapist", roles: ["INTEGRATIVE_THERAPIST", "ADMIN"] },
  { prefix: "/api/nutritionist", roles: ["PROFESSIONAL", "ADMIN"] },
  { prefix: "/api/nurse", roles: ["PROFESSIONAL", "ADMIN"] },
  { prefix: "/api/pharmacist", roles: ["PROFESSIONAL", "ADMIN"] },
  { prefix: "/api/dentist", roles: ["PROFESSIONAL", "ADMIN"] },
  { prefix: "/api/organization", roles: ["ORGANIZATION", "ADMIN"] },
  { prefix: "/api/employer", roles: ["EMPLOYER", "ADMIN"] },
  { prefix: "/api/occupational-physician", roles: ["OCCUPATIONAL_PHYSICIAN", "ADMIN"] },
  { prefix: "/api/pharmacy-store", roles: ["PHARMACY_STORE", "PROFESSIONAL", "ADMIN"] },
  { prefix: "/api/laboratory", roles: ["LABORATORY", "ADMIN"] },
  { prefix: "/api/humanitarian/angel", roles: ["ANGEL", "ADMIN"] },
  {
    prefix: "/api/humanitarian",
    roles: ["PATIENT", "PROFESSIONAL", "PSYCHOANALYST", "INTEGRATIVE_THERAPIST", "ANGEL", "ADMIN"],
  },
  { prefix: "/api/admin", roles: ["ADMIN"] },
];

/**
 * Returns false when the user's role may not access this API prefix.
 * Patient monitoring APIs also allow ANGEL (see isPatientAdminPath).
 */
export function isApiRoleAllowed(pathname: string, role: string | undefined | null): boolean {
  if (!role) return false;
  if (role === "ADMIN") return true;

  if (isPatientAdminPath(pathname) && (role === "ADMIN" || role === "ANGEL")) {
    return true;
  }

  // PDF handlers on professional routes already enforce patient/pro ownership.
  if (
    role === "PATIENT" &&
    (/^\/api\/professional\/prescriptions\/[^/]+\/pdf$/.test(pathname) ||
      /^\/api\/professional\/documents\/[^/]+\/pdf$/.test(pathname))
  ) {
    return true;
  }

  for (const { prefix, roles } of API_ROLE_RULES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return roles.includes(role);
    }
  }

  return true;
}
