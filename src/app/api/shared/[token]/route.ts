// src/app/api/shared/[token]/route.ts
// Public endpoint — validates a share token and returns the content
// No authentication required (public link for third-party sharing)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import {
  auditAnonymousShareView,
  checkPublicShareAccess,
  verifyPublicSharePin,
} from "@/lib/shared-record-public";

function safeDecrypt(v: string | null): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function loadShared(token: string) {
  return db.sharedRecord.findUnique({
    where: { accessToken: token },
    include: {
      document: { select: { title: true, type: true, content: true, createdAt: true } },
      patient: { select: { firstName: true, lastName: true, bloodType: true } },
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const { token } = params;
  const pin = req.nextUrl.searchParams.get("pin");

  const shared = await loadShared(token);
  if (!shared) {
    return NextResponse.json({ error: "Link not found or has been revoked." }, { status: 404 });
  }

  const access = await verifyPublicSharePin(shared, pin);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error, requiresPin: access.requiresPin ?? false },
      { status: access.status },
    );
  }

  const ip = clientIp(req);
  const userAgent = req.headers.get("user-agent") || "unknown";
  const nextViewCount = shared.viewCount + 1;
  const shouldRevoke = nextViewCount >= shared.maxViews;

  await db.sharedRecord.update({
    where: { id: shared.id },
    data: {
      viewCount: { increment: 1 },
      viewedAt: shared.viewedAt ?? new Date(),
      ...(shouldRevoke ? { revokedAt: new Date() } : {}),
    },
  });

  await auditAnonymousShareView(shared.id, ip, userAgent, {
    viewNumber: nextViewCount,
    revokedAfterView: shouldRevoke,
  });

  let content: Record<string, unknown> = {};
  if (shared.document.content) {
    try { content = JSON.parse(shared.document.content); } catch { content = {}; }
  }

  return NextResponse.json({
    title: shared.document.title,
    type: shared.document.type,
    patientName: `${safeDecrypt(shared.patient.firstName)} ${safeDecrypt(shared.patient.lastName)}`.trim(),
    createdAt: shared.document.createdAt,
    expiresAt: shared.expiresAt,
    content,
  });
}

/** HEAD — check link validity / PIN requirement without incrementing view count. */
export async function HEAD(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const shared = await loadShared(params.token);
  if (!shared) {
    return new NextResponse(null, { status: 404 });
  }

  const pin = req.nextUrl.searchParams.get("pin");
  const access = checkPublicShareAccess(shared, pin);
  if (!access.ok) {
    return new NextResponse(null, {
      status: access.status,
      headers: access.requiresPin ? { "X-Requires-Pin": "1" } : undefined,
    });
  }

  if (shared.viewPinHash && pin) {
    const verified = await verifyPublicSharePin(shared, pin);
    if (!verified.ok) {
      return new NextResponse(null, { status: verified.status });
    }
  }

  return new NextResponse(null, {
    status: 200,
    headers: shared.viewPinHash ? { "X-Requires-Pin": "1" } : undefined,
  });
}
