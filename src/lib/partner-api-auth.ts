// Server-to-server partner API authentication (Bearer token).
// Used by external backends (e.g. ACURA Brasil) — never expose the key in the browser.

import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

function safeEqualToken(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function readBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

/** Validates the ACURA / partner integration Bearer token. */
export function verifyPartnerApiKey(req: NextRequest): boolean {
  const expected = process.env.ACURA_PARTNER_API_KEY?.trim();
  if (!expected) return false;

  const provided = readBearerToken(req);
  if (!provided) return false;

  return safeEqualToken(provided, expected);
}

export function isPartnerApiConfigured(): boolean {
  return Boolean(process.env.ACURA_PARTNER_API_KEY?.trim());
}
