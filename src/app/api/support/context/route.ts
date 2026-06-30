// GET /api/support/context ? safe read-only context for support AI (NO user PII)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  assertNoPiiInSupportContext,
  getSupportPlatformCapabilities,
  sanitizeSupportContextResponse,
  type SupportContextApiResponse,
} from "@/lib/support-platform-capabilities";
import {
  checkRateLimit,
  clientIp,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { normalizeSupportRole } from "@/lib/support-context";

const ALLOWED_ROLES = new Set([
  "PATIENT",
  "PROFESSIONAL",
  "PSYCHOANALYST",
  "INTEGRATIVE_THERAPIST",
  "ORGANIZATION",
  "ADMIN",
]);

export async function GET(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const rate = await checkRateLimit({
      namespace: "support:context:ip",
      key: ip,
      ...RATE_LIMITS.supportIp,
    });
    if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

    const session = await auth();
    const pathname = req.nextUrl.searchParams.get("pathname") || "/";

    const raw: SupportContextApiResponse = {
      capabilities: getSupportPlatformCapabilities(),
      session: {
        isLoggedIn: !!session?.user,
        role:
          session?.user?.role && ALLOWED_ROLES.has(session.user.role)
            ? normalizeSupportRole(session.user.role, pathname)
            : null,
      },
    };

    const payload = sanitizeSupportContextResponse(raw);
    assertNoPiiInSupportContext(payload);

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[SUPPORT CONTEXT]", error);
    return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  }
}
