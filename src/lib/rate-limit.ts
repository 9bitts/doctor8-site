import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const RATE_LIMIT_PREFIX = "rl:";

export type RateLimitOptions = {
  /** Namespace, e.g. `magic-link` */
  namespace: string;
  /** Unique key within namespace (email, user id, ip, ?) */
  key: string;
  /** Max requests allowed per window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
};

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number };

function rateLimitToken(namespace: string, key: string): string {
  const normalized = key.toLowerCase().trim().slice(0, 180);
  return `${RATE_LIMIT_PREFIX}${namespace}:${normalized}`;
}

export function clientIp(req: NextRequest): string {
  const raw =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return raw.slice(0, 64);
}

export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const token = rateLimitToken(options.namespace, options.key);
  const now = Date.now();
  const windowEnd = new Date(now + options.windowMs);

  const existing = await db.verificationToken.findUnique({ where: { token } });

  if (!existing || existing.expires.getTime() <= now) {
    await db.verificationToken.upsert({
      where: { token },
      create: {
        identifier: "1",
        token,
        expires: windowEnd,
      },
      update: {
        identifier: "1",
        expires: windowEnd,
      },
    });
    return { allowed: true };
  }

  const count = Number.parseInt(existing.identifier, 10) || 0;
  if (count >= options.limit) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((existing.expires.getTime() - now) / 1000),
    );
    return { allowed: false, retryAfterSec };
  }

  await db.verificationToken.update({
    where: { token },
    data: { identifier: String(count + 1) },
  });

  return { allowed: true };
}

/** Apply multiple limits (e.g. per-email and per-ip). First failure wins. */
export async function checkRateLimits(
  limits: RateLimitOptions[],
): Promise<RateLimitResult> {
  for (const limit of limits) {
    const result = await checkRateLimit(limit);
    if (!result.allowed) return result;
  }
  return { allowed: true };
}

export function rateLimitResponse(retryAfterSec?: number): NextResponse {
  return NextResponse.json(
    { error: "RATE_LIMITED", retryAfterSec },
    {
      status: 429,
      headers: retryAfterSec ? { "Retry-After": String(retryAfterSec) } : undefined,
    },
  );
}

/** Standard presets used across public endpoints */
export const RATE_LIMITS = {
  /** Email/password reset and magic link */
  authEmail: { limit: 3, windowMs: 60 * 60 * 1000 },
  authIp: { limit: 15, windowMs: 60 * 60 * 1000 },
  /** Support chat (Anthropic proxy) */
  supportIp: { limit: 30, windowMs: 60 * 60 * 1000 },
  /** Humanitarian queue joins per patient */
  humanitarianJoin: { limit: 10, windowMs: 60 * 60 * 1000 },
  /** Humanitarian intake submissions per identity */
  humanitarianIntake: { limit: 10, windowMs: 60 * 60 * 1000 },
  /** Public CNPJ lookup during registration */
  cnpjIp: { limit: 40, windowMs: 60 * 60 * 1000 },
  /** Angel volunteer write actions */
  angelAction: { limit: 30, windowMs: 60 * 60 * 1000 },
  angelActionIp: { limit: 60, windowMs: 60 * 60 * 1000 },
  /** Partner email lookup (ACURA / SOS Venezuela) */
  partnerEmailCheckIp: { limit: 60, windowMs: 60 * 1000 },
  partnerEmailCheckToken: { limit: 120, windowMs: 60 * 1000 },
} as const;
