export const COOKIE_CONSENT_KEY = "d8_cookies";
export const PRO_COOKIE_CONSENT_KEY = "d8ck";

export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const main = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (main === "accepted") return true;
    return localStorage.getItem(PRO_COOKIE_CONSENT_KEY) === "ok";
  } catch {
    return false;
  }
}

export function notifyCookieConsentChanged(): void {
  window.dispatchEvent(new Event("d8:cookie-consent"));
}

const ANALYTICS_BLOCKED_PREFIXES = [
  "/patient",
  "/professional",
  "/psychologist",
  "/psychoanalyst",
  "/integrative-therapist",
  "/organization",
  "/humanitarian/angel",
  "/humanitarian/volunteer",
  "/admin",
  "/share",
];

export function allowsAnalyticsPath(pathname: string): boolean {
  if (pathname.startsWith("/api/")) return false;
  return !ANALYTICS_BLOCKED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
