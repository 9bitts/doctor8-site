import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { createRegisterConsents } from "@/lib/consent/register-consents";
import { parseRegistrationPhone } from "@/lib/international-phone";
import { encryptUserPhone } from "@/lib/user-phone";
import { registerAckResponse } from "@/lib/register-anti-enum";
import {
  checkRateLimits,
  clientIp,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";

const passwordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9]/);

const registerStaffSchema = z.object({
  token: z.string().min(16),
  password: passwordSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phoneDdi: z.string().min(1).max(4),
  phoneNational: z.string().min(6).max(20),
  acceptedTerms: z.literal(true),
  acceptedPrivacy: z.literal(true),
  acceptedLgpd: z.literal(true),
});

/** @deprecated Use POST /api/auth/validate-employer-invite — minimized response, no PII */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const ip = clientIp(req);
  const rate = await checkRateLimits([
    { namespace: "register-employer-staff-get:ip", key: ip, ...RATE_LIMITS.authIp },
    { namespace: "register-employer-staff-get:token", key: token, ...RATE_LIMITS.authIp },
  ]);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

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
    role: invite.role,
    companyName: invite.employerCompany.nomeFantasia,
    expiresAt: invite.expiresAt.toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const rate = await checkRateLimits([
      { namespace: "register-employer-staff:ip", key: ip, ...RATE_LIMITS.authIp },
    ]);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

    const body = await req.json();
    const data = registerStaffSchema.safeParse(body);
    if (!data.success) {
      return NextResponse.json({ error: data.error.flatten().fieldErrors }, { status: 400 });
    }

    const invite = await db.employerInvite.findUnique({
      where: { token: data.data.token },
      include: { employerCompany: true },
    });

    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: { general: ["Convite inválido ou expirado"] } }, { status: 400 });
    }

    const phoneParsed = parseRegistrationPhone({
      phoneDdi: data.data.phoneDdi,
      phoneNational: data.data.phoneNational,
    });
    if ("error" in phoneParsed) {
      return NextResponse.json(
        { error: { phoneNational: ["Telefone inválido"] } },
        { status: 400 },
      );
    }

    const email = invite.email.toLowerCase();
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return registerAckResponse();
    }

    const passwordHash = await bcrypt.hash(data.data.password, 12);
    const userAgent = req.headers.get("user-agent") || "unknown";

    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: UserRole.EMPLOYER,
          region: "BR",
          language: "pt",
          emailVerified: new Date(),
          phone: encryptUserPhone(phoneParsed.e164),
        },
      });

      await tx.employerMember.create({
        data: {
          employerCompanyId: invite.employerCompanyId,
          userId: newUser.id,
          role: invite.role,
          status: "ACTIVE",
          invitedAt: invite.createdAt,
        },
      });

      await tx.employerInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });

      await createRegisterConsents(tx, newUser.id, ip, userAgent, {
        acceptedTerms: data.data.acceptedTerms,
        acceptedPrivacy: data.data.acceptedPrivacy,
        acceptedLgpd: data.data.acceptedLgpd,
      });

      return newUser;
    });

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("[EMPLOYER STAFF REGISTER]", error);
    return NextResponse.json({ error: { general: ["Erro ao criar conta"] } }, { status: 500 });
  }
}
