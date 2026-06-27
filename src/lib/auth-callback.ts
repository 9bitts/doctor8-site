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

/** Safe internal register path from ?registerUrl= (defaults to patient /register). */
export function resolveRegisterHref(
  registerUrl: string | null | undefined,
  callbackUrl?: string | null,
): string {
  const base =
    registerUrl?.startsWith("/register") && !registerUrl.startsWith("//")
      ? registerUrl
      : "/register";
  if (!callbackUrl) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}callbackUrl=${encodeURIComponent(callbackUrl)}`;
}
