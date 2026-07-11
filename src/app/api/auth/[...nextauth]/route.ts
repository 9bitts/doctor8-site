// src/app/api/auth/[...nextauth]/route.ts
// This file exposes the NextAuth handlers as API routes.
// Without it, /api/auth/* endpoints (signin, callback, session) return 404.
import { handlers } from "@/lib/auth";
import type { NextRequest } from "next/server";
import {
  checkRateLimit,
  clientIp,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";

const LOGIN_CALLBACK_PATHS = new Set([
  "/api/auth/callback/credentials",
  "/api/auth/callback/magic-link",
]);

function isLoginRateLimitEnabled(): boolean {
  const raw = process.env.AUTH_LOGIN_RATE_LIMIT_ENABLED;
  if (raw === undefined) return true;
  return raw !== "false" && raw !== "0";
}

function loginRateLimitOptions(): { limit: number; windowMs: number } {
  const maxRaw = process.env.AUTH_LOGIN_RATE_LIMIT_MAX ?? "";
  const windowRaw = process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS ?? "";
  const max = Number.parseInt(maxRaw, 10);
  const windowMs = Number.parseInt(windowRaw, 10);
  return {
    limit: Number.isFinite(max) && max > 0 ? max : RATE_LIMITS.authLogin.limit,
    windowMs:
      Number.isFinite(windowMs) && windowMs > 0
        ? windowMs
        : RATE_LIMITS.authLogin.windowMs,
  };
}

async function withLoginRateLimit(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<Response>,
): Promise<Response> {
  if (!isLoginRateLimitEnabled()) {
    return handler(req);
  }

  const { pathname } = req.nextUrl;
  if (req.method !== "POST" || !LOGIN_CALLBACK_PATHS.has(pathname)) {
    return handler(req);
  }

  const { limit, windowMs } = loginRateLimitOptions();
  const rate = await checkRateLimit({
    namespace: "login:ip",
    key: clientIp(req),
    limit,
    windowMs,
  });
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

  return handler(req);
}

export async function GET(req: NextRequest) {
  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  return withLoginRateLimit(req, handlers.POST);
}
