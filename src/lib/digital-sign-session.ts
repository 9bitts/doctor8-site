// Tracks recent successful Lacuna/BirdID auth in a browser cookie (24h).
// BirdID session persistence is browser-side; this skips redundant confirmation modals.

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const DIGITAL_SIGN_TRUST_COOKIE = "d8_digital_sign_trust";
/** 24 hours — matches beta expectation for BirdID re-auth frequency. */
export const DIGITAL_SIGN_TRUST_MAX_AGE_SEC = 60 * 60 * 24;

export function markDigitalSignTrust(response: NextResponse): void {
  response.cookies.set(DIGITAL_SIGN_TRUST_COOKIE, String(Date.now()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: DIGITAL_SIGN_TRUST_MAX_AGE_SEC,
    path: "/",
  });
}

export function hasRecentDigitalSignTrust(): boolean {
  const raw = cookies().get(DIGITAL_SIGN_TRUST_COOKIE)?.value;
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts) || ts <= 0) return false;
  return Date.now() - ts < DIGITAL_SIGN_TRUST_MAX_AGE_SEC * 1000;
}
