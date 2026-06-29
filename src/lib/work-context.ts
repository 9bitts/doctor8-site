// Scope cookies for organization (filter by doctor) and professional (solo vs clinic).

export const ORG_PROFESSIONAL_COOKIE = "doctor8_org_professional";
export const PRO_SCOPE_COOKIE = "doctor8_pro_scope";

export type ProScope = "solo" | "clinic";

export function resolveOrgProfessionalFilter(
  allIds: string[],
  requestedId: string | null | undefined,
): string[] {
  if (!requestedId?.trim()) return allIds;
  const id = requestedId.trim();
  return allIds.includes(id) ? [id] : allIds;
}

export function readOrgProfessionalCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${ORG_PROFESSIONAL_COOKIE}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : "";
}

export function writeOrgProfessionalCookie(professionalId: string): void {
  if (typeof document === "undefined") return;
  const value = professionalId ? encodeURIComponent(professionalId) : "";
  document.cookie = `${ORG_PROFESSIONAL_COOKIE}=${value};path=/;max-age=31536000;SameSite=Lax`;
  window.dispatchEvent(new CustomEvent("doctor8-org-scope-change", { detail: professionalId }));
}

export function readProScopeCookie(): ProScope {
  if (typeof document === "undefined") return "solo";
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${PRO_SCOPE_COOKIE}=([^;]*)`),
  );
  const v = match ? decodeURIComponent(match[1]) : "solo";
  return v === "clinic" ? "clinic" : "solo";
}

export function writeProScopeCookie(scope: ProScope): void {
  if (typeof document === "undefined") return;
  document.cookie = `${PRO_SCOPE_COOKIE}=${scope};path=/;max-age=31536000;SameSite=Lax`;
  window.dispatchEvent(new CustomEvent("doctor8-pro-scope-change", { detail: scope }));
}

/** Server-side: read org professional filter from request cookies. */
export function orgProfessionalIdFromCookie(
  cookieValue: string | undefined,
): string | undefined {
  const v = cookieValue?.trim();
  return v || undefined;
}
