import { readClientHumReturnPath } from "@/lib/humanitarian/origin-cookie";

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

export type ClientAuthCallback = {
  callback: string;
  /** True when destination came from humanitarian return cookie without an explicit query param. */
  fromHumCookie: boolean;
};

export type ClientAuthCallbackOptions = {
  /** Fall back to humanitarian return cookie when ?callbackUrl= is absent (SOS portal only). */
  allowHumCookieFallback?: boolean;
};

/** Resolve post-auth callback from query param, optionally with humanitarian cookie fallback. */
export function resolveClientAuthCallback(
  queryCallback?: string | null,
  options?: ClientAuthCallbackOptions,
): ClientAuthCallback {
  const trimmed = queryCallback?.trim();
  if (trimmed) return { callback: trimmed, fromHumCookie: false };
  if (options?.allowHumCookieFallback) {
    const returnPath = readClientHumReturnPath();
    if (returnPath) return { callback: returnPath, fromHumCookie: true };
  }
  return { callback: "", fromHumCookie: false };
}

export function resolveClientAuthCallbackUrl(queryCallback?: string | null): string {
  return resolveClientAuthCallback(queryCallback).callback;
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
  const effective = callbackUrl?.trim();
  if (!effective) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}callbackUrl=${encodeURIComponent(effective)}`;
}
