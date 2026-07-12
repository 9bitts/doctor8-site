// Scope cookies for organization (filter by provider) and professional (solo vs clinic).

import { buildProviderScopeKey } from "@/lib/organization-providers";
import type { ProviderType } from "@prisma/client";

export const ORG_PROVIDER_COOKIE = "doctor8_org_provider";
/** @deprecated use ORG_PROVIDER_COOKIE ? legacy doctor-only filter */
export const ORG_PROFESSIONAL_COOKIE = "doctor8_org_professional";
export const PRO_SCOPE_COOKIE = "doctor8_pro_scope";
export const EMPLOYER_COMPANY_COOKIE = "doctor8_employer_company";

export type ProScope = "solo" | "clinic";

export function resolveOrgProfessionalFilter(
  allIds: string[],
  requestedId: string | null | undefined,
): string[] {
  if (!requestedId?.trim()) return allIds;
  const id = requestedId.trim();
  return allIds.includes(id) ? [id] : allIds;
}

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export function readOrgProviderScopeCookie(): string {
  const composite = readCookie(ORG_PROVIDER_COOKIE);
  if (composite) return composite;
  const legacyDoctorId = readCookie(ORG_PROFESSIONAL_COOKIE);
  if (legacyDoctorId) {
    return buildProviderScopeKey("HEALTH", legacyDoctorId);
  }
  return "";
}

/** @deprecated */
export function readOrgProfessionalCookie(): string {
  const scope = readOrgProviderScopeCookie();
  if (scope.startsWith("HEALTH:")) return scope.slice("HEALTH:".length);
  return readCookie(ORG_PROFESSIONAL_COOKIE);
}

export function writeOrgProviderScopeCookie(scopeKey: string): void {
  if (typeof document === "undefined") return;
  const value = scopeKey ? encodeURIComponent(scopeKey) : "";
  document.cookie = `${ORG_PROVIDER_COOKIE}=${value};path=/;max-age=31536000;SameSite=Lax`;
  document.cookie = `${ORG_PROFESSIONAL_COOKIE}=;path=/;max-age=0;SameSite=Lax`;
  window.dispatchEvent(new CustomEvent("doctor8-org-scope-change", { detail: scopeKey }));
}

/** @deprecated */
export function writeOrgProfessionalCookie(professionalId: string): void {
  if (!professionalId) {
    writeOrgProviderScopeCookie("");
    return;
  }
  writeOrgProviderScopeCookie(buildProviderScopeKey("HEALTH", professionalId));
}

export function readProScopeCookie(): ProScope {
  const v = readCookie(PRO_SCOPE_COOKIE);
  return v === "clinic" ? "clinic" : "solo";
}

export function writeProScopeCookie(scope: ProScope): void {
  if (typeof document === "undefined") return;
  document.cookie = `${PRO_SCOPE_COOKIE}=${scope};path=/;max-age=31536000;SameSite=Lax`;
  window.dispatchEvent(new CustomEvent("doctor8-pro-scope-change", { detail: scope }));
}

export function readEmployerCompanyCookie(): string {
  return readCookie(EMPLOYER_COMPANY_COOKIE);
}

export function writeEmployerCompanyCookie(companyId: string): void {
  if (typeof document === "undefined") return;
  const value = companyId ? encodeURIComponent(companyId) : "";
  document.cookie = `${EMPLOYER_COMPANY_COOKIE}=${value};path=/;max-age=31536000;SameSite=Lax`;
  window.dispatchEvent(new CustomEvent("doctor8-employer-company-change", { detail: companyId }));
}

/** Server-side: resolve selected employer company from cookie. */
export function employerCompanyIdFromCookies(
  getCookie: (name: string) => string | undefined,
): string | undefined {
  const raw = getCookie(EMPLOYER_COMPANY_COOKIE)?.trim();
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Server-side: resolve org provider scope from cookies or legacy doctor id. */
export function orgProviderScopeFromCookies(getCookie: (name: string) => string | undefined): string | undefined {
  const composite = getCookie(ORG_PROVIDER_COOKIE)?.trim();
  if (composite) return decodeURIComponent(composite);
  const legacy = getCookie(ORG_PROFESSIONAL_COOKIE)?.trim();
  if (legacy) return buildProviderScopeKey("HEALTH", legacy);
  return undefined;
}

/** Server-side: read legacy doctor-only filter. */
export function orgProfessionalIdFromCookie(cookieValue: string | undefined): string | undefined {
  const v = cookieValue?.trim();
  return v || undefined;
}

export function providerScopeFromQuery(
  providerScope: string | null | undefined,
  professionalId: string | null | undefined,
): string | undefined {
  const scope = providerScope?.trim();
  if (scope) return scope;
  const legacyId = professionalId?.trim();
  if (legacyId) return buildProviderScopeKey("HEALTH" as ProviderType, legacyId);
  return undefined;
}
