// Server-to-server: check whether an email belongs to a registered patient account.
// Partner: ACURA Brasil / SOS Venezuela triage ù returns boolean only (LGPD).

import { NextRequest, NextResponse } from "next/server";
import { AuditAction, UserRole } from "@prisma/client";
import {
  checkRateLimits,
  clientIp,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { isPartnerApiConfigured, verifyPartnerApiKey } from "@/lib/partner-api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emailSchema = z.string().email().max(320);

async function resolveEmail(req: NextRequest): Promise<
  { ok: true; email: string } | { ok: false; status: 400 }
> {
  if (req.method === "GET") {
    const raw = new URL(req.url).searchParams.get("email")?.trim();
    const parsed = emailSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, status: 400 };
    }
    return { ok: true, email: parsed.data.toLowerCase() };
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, status: 400 };
  }

  const parsed = z.object({ email: emailSchema }).safeParse(body);
  if (!parsed.success) {
    return { ok: false, status: 400 };
  }
  return { ok: true, email: parsed.data.email.toLowerCase() };
}

async function isRegisteredPatient(email: string): Promise<boolean> {
  const user = await db.user.findFirst({
    where: {
      email,
      role: UserRole.PATIENT,
      deletedAt: null,
    },
    select: { id: true },
  });
  return Boolean(user);
}

async function handleCheck(req: NextRequest): Promise<NextResponse> {
  if (!isPartnerApiConfigured()) {
    return NextResponse.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503 });
  }

  if (!verifyPartnerApiKey(req)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const ip = clientIp(req);
  const rate = await checkRateLimits([
    { namespace: "partner-check-email:ip", key: ip, ...RATE_LIMITS.partnerEmailCheckIp },
    { namespace: "partner-check-email:token", key: "acura", ...RATE_LIMITS.partnerEmailCheckToken },
  ]);
  if (!rate.allowed) {
    return rateLimitResponse(rate.retryAfterSec);
  }

  const resolved = await resolveEmail(req);
  if (!resolved.ok) {
    return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
  }

  const registered = await isRegisteredPatient(resolved.email);

  createAuditLog({
    action: AuditAction.VIEW_RECORD,
    resource: "AcuraPartnerApi",
    details: {
      partner: "acura",
      operation: "check_email",
      registered,
      ip,
    },
  }).catch(() => {});

  return NextResponse.json({ registered });
}

export async function GET(req: NextRequest) {
  return handleCheck(req);
}

export async function POST(req: NextRequest) {
  return handleCheck(req);
}
