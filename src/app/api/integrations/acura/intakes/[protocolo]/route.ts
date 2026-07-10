import { NextRequest, NextResponse } from "next/server";
import { AuditAction } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import {
  checkRateLimits,
  clientIp,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { isPartnerApiConfigured, verifyPartnerApiKey } from "@/lib/partner-api-auth";
import {
  acuraIntakePatchSchema,
  patchAcuraPartnerIntake,
} from "@/lib/partner/acura-intake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { protocolo: string } },
) {
  if (!isPartnerApiConfigured()) {
    return NextResponse.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503 });
  }
  if (!verifyPartnerApiKey(req)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const protocolo = String(params.protocolo || "").trim().slice(0, 64);
  if (!protocolo) {
    return NextResponse.json({ error: "INVALID_PROTOCOL" }, { status: 400 });
  }

  const ip = clientIp(req);
  const rate = await checkRateLimits([
    { namespace: "partner-acura-intake:ip", key: ip, ...RATE_LIMITS.partnerEmailCheckIp },
    { namespace: "partner-acura-intake:token", key: "acura", ...RATE_LIMITS.partnerEmailCheckToken },
  ]);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = acuraIntakePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await patchAcuraPartnerIntake(protocolo, parsed.data);
    createAuditLog({
      action: AuditAction.UPDATE_RECORD,
      resource: "AcuraPartnerIntake",
      details: { partner: "acura", operation: "patch", protocolo, ip },
    }).catch(() => {});

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "server_error";
    if (msg === "not_found") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    if (msg === "invalid_acura_status") {
      return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
    }
    console.error("[ACURA INTAKE PATCH]", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
