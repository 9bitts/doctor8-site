/** AcuraBrasil volunteer badge ? opt-in separate from humanitarian shift queue. */

export const ACURA_VOLUNTEER_LOGO = "/branding/acurabrasil-logo.png";
export const ACURA_VOLUNTEER_TERMS_URL = "https://acurabrasil.org/sos-venezuela.html";

export type ProviderRole = "PROFESSIONAL" | "PSYCHOANALYST" | "INTEGRATIVE_THERAPIST";

export function isAcuraVolunteerProvider(verified: boolean, acuraVolunteer: boolean): boolean {
  return verified && acuraVolunteer;
}
