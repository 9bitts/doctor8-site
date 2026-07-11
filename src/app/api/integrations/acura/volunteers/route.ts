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
import { listAcuraVolunteerDirectory } from "@/lib/partner/acura-volunteer-directory";
import { localeOf, normalizeLang } from "@/lib/i18n/translations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isPartnerApiConfigured()) {
    return NextResponse.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503 });
  }
  if (!verifyPartnerApiKey(req)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const ip = clientIp(req);
  const rate = await checkRateLimits([
    { namespace: "partner-acura-volunteers:ip", key: ip, ...RATE_LIMITS.partnerEmailCheckIp },
    {
      namespace: "partner-acura-volunteers:token",
      key: "acura",
      ...RATE_LIMITS.partnerEmailCheckToken,
    },
  ]);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

  const { searchParams } = req.nextUrl;
  const specialty = searchParams.get("specialty")?.trim() || null;
  const hasSlots = searchParams.get("hasSlots") === "1";
  const lang = normalizeLang(searchParams.get("lang"));
  const locale = localeOf(lang);

  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  const offset = offsetRaw ? Number(offsetRaw) : undefined;

  if (limit != null && (Number.isNaN(limit) || limit < 1)) {
    return NextResponse.json({ error: "INVALID_LIMIT" }, { status: 400 });
  }
  if (offset != null && (Number.isNaN(offset) || offset < 0)) {
    return NextResponse.json({ error: "INVALID_OFFSET" }, { status: 400 });
  }

  try {
    const result = await listAcuraVolunteerDirectory({
      specialty,
      hasSlots: hasSlots || undefined,
      locale,
      limit,
      offset,
    });

    createAuditLog({
      action: AuditAction.VIEW_RECORD,
      resource: "AcuraVolunteerDirectory",
      details: {
        partner: "acura",
        ip,
        count: result.volunteers.length,
        total: result.total,
        specialty,
        hasSlots,
      },
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      total: result.total,
      count: result.volunteers.length,
      volunteers: result.volunteers,
    });
  } catch (err) {
    console.error("[ACURA VOLUNTEERS LIST]", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
