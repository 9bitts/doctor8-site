import {
  readClientHumOriginFlag,
  readClientHumReturnPath,
  resolveHumanitarianAuthCallback,
} from "@/lib/humanitarian/origin-cookie";

const AUTH_CALLBACK_KEY = "doctor8.authCallback";

export function persistAuthCallback(url: string) {
  if (!url || typeof window === "undefined") return;
  try {
    sessionStorage.setItem(AUTH_CALLBACK_KEY, url);
  } catch { /* ignore */ }
}

export function consumeAuthCallback(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const url = sessionStorage.getItem(AUTH_CALLBACK_KEY);
    if (url) sessionStorage.removeItem(AUTH_CALLBACK_KEY);
    return url;
  } catch {
    return null;
  }
}

/** Query ?callbackUrl= with humanitarian origin cookie fallback. */
export function resolveClientAuthCallback(queryCallback?: string | null): string {
  const trimmed = queryCallback?.trim();
  if (trimmed) return trimmed;
  return (
    resolveHumanitarianAuthCallback(null, {
      originCookie: readClientHumOriginFlag(),
      returnPath: readClientHumReturnPath(),
    }) ?? ""
  );
}

/** Safe internal register path from ?registerUrl= (defaults to patient /register). */
export function resolveRegisterHref(
  registerUrl: string | null | undefined,
  callbackUrl?: string | null,
): string {
  const base =
    registerUrl?.startsWith("/register") && !registerUrl.startsWith("//")
      ? registerUrl
      : "/register";
  const effective = callbackUrl?.trim() || resolveClientAuthCallback(null);
  if (!effective) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}callbackUrl=${encodeURIComponent(effective)}`;
}
