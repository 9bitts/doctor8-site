import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  checkRateLimits,
  clientIp,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";

const validateSchema = z.object({
  kind: z.enum(["staff", "physician"]),
  token: z.string().min(16),
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const body = await req.json().catch(() => null);
  const parsed = validateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { kind, token } = parsed.data;
  const rate = await checkRateLimits([
    { namespace: "validate-employer-invite:ip", key: ip, ...RATE_LIMITS.authIp },
    { namespace: "validate-employer-invite:token", key: token, ...RATE_LIMITS.authIp },
  ]);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

  if (kind === "staff") {
    const invite = await db.employerInvite.findUnique({
      where: { token },
      include: {
        employerCompany: { select: { nomeFantasia: true } },
      },
    });

    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "INVALID_OR_EXPIRED" }, { status: 404 });
    }

    return NextResponse.json({
      email: invite.email,
      role: invite.role,
      companyName: invite.employerCompany.nomeFantasia,
      expiresAt: invite.expiresAt.toISOString(),
    });
  }

  const link = await db.employerOccupationalPhysician.findUnique({
    where: { inviteToken: token },
    include: {
      employerCompany: { select: { nomeFantasia: true } },
    },
  });

  if (
    !link ||
    link.status === "DISABLED" ||
    (link.expiresAt && link.expiresAt < new Date()) ||
    link.userId
  ) {
    return NextResponse.json({ error: "INVALID_OR_EXPIRED" }, { status: 404 });
  }

  return NextResponse.json({
    email: link.email,
    fullName: link.fullName,
    crm: link.crm,
    companyName: link.employerCompany.nomeFantasia,
    expiresAt: link.expiresAt?.toISOString() ?? null,
  });
}
