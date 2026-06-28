/** AcuraBrasil volunteer badge ? opt-in separate from humanitarian shift queue. */

export const ACURA_VOLUNTEER_LOGO = "/branding/acurabrasil-logo.png";
export const ACURA_VOLUNTEER_TERMS_URL = "https://acurabrasil.org/sos-venezuela.html";

export type ProviderRole = "PROFESSIONAL" | "PSYCHOANALYST" | "INTEGRATIVE_THERAPIST";

export function isAcuraVolunteerProvider(verified: boolean, acuraVolunteer: boolean): boolean {
  return verified && acuraVolunteer;
}

/** Sort volunteers first, then alphabetically by name. */
export function compareVolunteerFirst<
  T extends { verified?: boolean; acuraVolunteer?: boolean; firstName: string; lastName?: string | null },
>(a: T, b: T): number {
  const rank = (p: T) =>
    isAcuraVolunteerProvider(!!p.verified, !!p.acuraVolunteer) ? 0 : 1;
  const diff = rank(a) - rank(b);
  if (diff !== 0) return diff;
  const nameA = `${a.firstName} ${a.lastName ?? ""}`.trim();
  const nameB = `${b.firstName} ${b.lastName ?? ""}`.trim();
  return nameA.localeCompare(nameB);
}
