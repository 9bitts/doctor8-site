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

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function updateGoogleAnalyticsConsent(granted: boolean): void {
  if (typeof window.gtag !== "function") return;
  window.gtag("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
  });
  if (granted) {
    window.gtag("event", "page_view");
  }
}

const ANALYTICS_BLOCKED_PREFIXES = [
  "/patient",
  "/professional",
  "/psychologist",
  "/psychoanalyst",
  "/integrative-therapist",
  "/organization",
  "/empresas/painel",
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
