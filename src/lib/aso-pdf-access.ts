import type { UserRole } from "@prisma/client";

export type AsoPdfAccessInput = {
  role: UserRole | string;
  hasEmployerMembership: boolean;
  employerCompanyId: string | null;
  hasPhysicianLink: boolean;
  examCompanyId: string;
};

export type AsoPdfAccessResult =
  | { allowed: true; scopeCompanyId: string }
  | { allowed: false; status: 403 | 404 };

/** Pure access gate for ASO PDF download — mirrors route handler logic. */
export function resolveAsoPdfAccess(input: AsoPdfAccessInput): AsoPdfAccessResult {
  const { role, hasEmployerMembership, employerCompanyId, hasPhysicianLink, examCompanyId } =
    input;

  if (role === "ADMIN") {
    return { allowed: true, scopeCompanyId: examCompanyId };
  }

  if (role === "EMPLOYER") {
    if (!hasEmployerMembership || !employerCompanyId) {
      return { allowed: false, status: 404 };
    }
    if (employerCompanyId !== examCompanyId) {
      return { allowed: false, status: 404 };
    }
    return { allowed: true, scopeCompanyId: employerCompanyId };
  }

  if (role === "OCCUPATIONAL_PHYSICIAN") {
    if (!hasPhysicianLink) {
      return { allowed: false, status: 403 };
    }
    return { allowed: true, scopeCompanyId: examCompanyId };
  }

  return { allowed: false, status: 403 };
}
