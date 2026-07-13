import type { NextResponse } from "next/server";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

/** Short-lived marker: user entered via SOS / humanitarian patient campaign. */
export const HUM_ORIGIN_COOKIE = "doctor8.hum.origin";
/** Return path for post-auth redirect when ?callbackUrl= is missing. */
export const HUM_RETURN_COOKIE = "doctor8.hum.return";
export const HUM_ORIGIN_MAX_AGE_SECONDS = 2 * 60 * 60;

import { HUMANITARIAN_PATIENT_HOME } from "@/lib/humanitarian/patient-identity";

const DEFAULT_CAMPAIGN_PATH = `/humanitarian/${VENEZUELA_CAMPAIGN_SLUG}`;
const PORTAL_RETURN_PATH = HUMANITARIAN_PATIENT_HOME;

function parseCookieMap(header: string | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!header) return map;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    map.set(key, decodeURIComponent(value));
  }
  return map;
}

/** True when pathname is SOS landing or in-app humanitarian patient campaign (not volunteer/angel). */
export function isHumanitarianPatientPath(pathname: string): boolean {
  if (pathname === "/sos-venezuela" || pathname === "/atendimentohumanitario") return true;
  if (pathname === HUMANITARIAN_PATIENT_HOME || pathname.startsWith(`${HUMANITARIAN_PATIENT_HOME}/`)) {
    return true;
  }
  const match = pathname.match(/^\/humanitarian\/([^/]+)/);
  if (!match) return false;
  const segment = match[1];
  return segment !== "volunteer" && segment !== "angel" && segment !== "angel-optout";
}

/** Preferred return URL when entering the flow from this pathname. */
export function humanitarianReturnPathFromPathname(pathname: string): string | null {
  if (pathname === "/atendimentohumanitario") {
    return PORTAL_RETURN_PATH;
  }
  if (pathname === "/sos-venezuela") {
    return DEFAULT_CAMPAIGN_PATH;
  }
  if (!isHumanitarianPatientPath(pathname)) return null;
  return pathname.split("?")[0] || DEFAULT_CAMPAIGN_PATH;
}

export function defaultHumanitarianReturnPath(): string {
  return DEFAULT_CAMPAIGN_PATH;
}

/** Return path from ?callbackUrl= when it points at SOS / humanitarian patient flow. */
export function humanitarianReturnPathFromCallback(
  callbackUrl: string | null | undefined,
): string | null {
  if (!callbackUrl?.trim()) return null;
  const trimmed = callbackUrl.trim();
  try {
    const path = trimmed.startsWith("http")
      ? new URL(trimmed).pathname
      : trimmed.split("?")[0];
    if (!path.startsWith("/")) return null;
    return humanitarianReturnPathFromPathname(path);
  } catch {
    return null;
  }
}

const HUM_ORIGIN_COOKIE_OPTIONS = {
  path: "/",
  maxAge: HUM_ORIGIN_MAX_AGE_SECONDS,
  sameSite: "lax" as const,
  httpOnly: true,
};

const HUM_RETURN_COOKIE_OPTIONS = {
  path: "/",
  maxAge: HUM_ORIGIN_MAX_AGE_SECONDS,
  sameSite: "lax" as const,
};

/** Middleware / route handlers: stamp short-lived humanitarian origin cookies. */
export function stampHumanitarianOriginOnResponse(
  response: NextResponse,
  returnPath: string,
): void {
  response.cookies.set(HUM_ORIGIN_COOKIE, "1", HUM_ORIGIN_COOKIE_OPTIONS);
  response.cookies.set(HUM_RETURN_COOKIE, returnPath, HUM_RETURN_COOKIE_OPTIONS);
}

/** Client: set return cookie only (origin flag is middleware httpOnly). */
export function setHumanitarianOriginCookies(returnPath: string) {
  if (typeof document === "undefined") return;
  const maxAge = HUM_ORIGIN_MAX_AGE_SECONDS;
  const base = `path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `${HUM_RETURN_COOKIE}=${encodeURIComponent(returnPath)}; ${base}`;
}

/** Client: persist origin cookies when auth pages receive a humanitarian callbackUrl. */
export function syncHumanitarianOriginFromCallback(callbackUrl: string | null | undefined) {
  const returnPath = humanitarianReturnPathFromCallback(callbackUrl);
  if (returnPath) setHumanitarianOriginCookies(returnPath);
}

export function readHumOriginFlagFromCookieHeader(cookieHeader: string | undefined): boolean {
  const map = parseCookieMap(cookieHeader);
  const raw = map.get(HUM_ORIGIN_COOKIE);
  return raw === "1" || raw === "true";
}

export function readHumReturnPathFromCookieHeader(
  cookieHeader: string | undefined,
): string | null {
  const map = parseCookieMap(cookieHeader);
  const raw = map.get(HUM_RETURN_COOKIE);
  if (!raw) return null;
  return raw.startsWith("/") ? raw : null;
}

/** Client: read return path from document.cookie. */
export function readClientHumReturnPath(): string | null {
  if (typeof document === "undefined") return null;
  return readHumReturnPathFromCookieHeader(document.cookie);
}

/** Client cannot read httpOnly `doctor8.hum.origin` — skip-verify applies server-side only. */
export function readClientHumOriginFlag(): boolean {
  return false;
}

/** Expire humanitarian origin cookies on a server response (logout / login reset). */
export function clearHumanitarianOriginCookies(response: NextResponse): void {
  response.cookies.set(HUM_ORIGIN_COOKIE, "", { ...HUM_ORIGIN_COOKIE_OPTIONS, maxAge: 0 });
  response.cookies.set(HUM_RETURN_COOKIE, "", { ...HUM_RETURN_COOKIE_OPTIONS, maxAge: 0 });
}

/** Server: origin flag + return path from next/headers cookies(). */
export async function readServerHumAuthCookies(): Promise<{
  originCookie: boolean;
  returnPath: string | null;
}> {
  try {
    const { cookies } = await import("next/headers");
    const jar = cookies();
    const originCookie = jar.get(HUM_ORIGIN_COOKIE)?.value === "1";
    const raw = jar.get(HUM_RETURN_COOKIE)?.value;
    const returnPath = raw?.startsWith("/") ? raw : null;
    return { originCookie, returnPath };
  } catch {
    return { originCookie: false, returnPath: null };
  }
}

export type HumanitarianAuthSources = {
  callbackUrl?: string | null;
  originCookie?: boolean;
  returnPath?: string | null;
};

/** Resolve callbackUrl for auth when query param is absent but origin cookie is set. */
export function resolveHumanitarianAuthCallback(
  callbackUrl: string | null | undefined,
  sources: Omit<HumanitarianAuthSources, "callbackUrl">,
): string | null {
  if (callbackUrl?.trim()) return callbackUrl.trim();
  if (sources.originCookie && sources.returnPath) return sources.returnPath;
  if (sources.originCookie) return defaultHumanitarianReturnPath();
  return null;
}
