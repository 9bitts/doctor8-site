import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { UserRole, ConsentType } from "@prisma/client";
import { parseRegistrationPhone } from "@/lib/international-phone";
import { encryptUserPhone } from "@/lib/user-phone";
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

const registerSchema = z.object({
  token: z.string().min(16),
  password: passwordSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phoneDdi: z.string().min(1).max(4),
  phoneNational: z.string().min(6).max(20),
  acceptedTerms: z.literal(true),
  acceptedPrivacy: z.literal(true),
  acceptedGdpr: z.literal(true),
});

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const link = await db.employerOccupationalPhysician.findUnique({
    where: { inviteToken: token },
    include: {
      employerCompany: { select: { nomeFantasia: true, razaoSocial: true } },
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

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const rate = await checkRateLimits([
      { namespace: "register-occ-physician:ip", key: ip, ...RATE_LIMITS.authIp },
    ]);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

    const body = await req.json();
    const data = registerSchema.safeParse(body);
    if (!data.success) {
      return NextResponse.json({ error: data.error.flatten().fieldErrors }, { status: 400 });
    }

    const link = await db.employerOccupationalPhysician.findUnique({
      where: { inviteToken: data.data.token },
      include: { employerCompany: true },
    });

    if (
      !link ||
      link.status === "DISABLED" ||
      (link.expiresAt && link.expiresAt < new Date()) ||
      link.userId
    ) {
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

    const email = link.email.toLowerCase();
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        {
          error: { email: ["Este e-mail já possui conta."] },
          acceptUrl: `/empresas/medico/aceitar?token=${encodeURIComponent(data.data.token)}`,
        },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(data.data.password, 12);
    const userAgent = req.headers.get("user-agent") || "unknown";
    const fullName = `${data.data.firstName.trim()} ${data.data.lastName.trim()}`.trim();

    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: UserRole.OCCUPATIONAL_PHYSICIAN,
          region: "BR",
          language: "pt",
          emailVerified: new Date(),
          phone: encryptUserPhone(phoneParsed.e164),
        },
      });

      await tx.employerOccupationalPhysician.update({
        where: { id: link.id },
        data: {
          userId: newUser.id,
          fullName: link.fullName || fullName,
          status: "ACTIVE",
          inviteToken: null,
          joinedAt: new Date(),
        },
      });

      await tx.consent.createMany({
        data: [
          { userId: newUser.id, type: ConsentType.TERMS_OF_SERVICE, version: "1.0", granted: true, ipAddress: ip, userAgent },
          { userId: newUser.id, type: ConsentType.PRIVACY_POLICY, version: "1.0", granted: true, ipAddress: ip, userAgent },
          { userId: newUser.id, type: ConsentType.GDPR_CONSENT, version: "1.0", granted: true, ipAddress: ip, userAgent },
        ],
      });

      return newUser;
    });

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("[OCCUPATIONAL PHYSICIAN REGISTER]", error);
    return NextResponse.json({ error: { general: ["Erro ao criar conta"] } }, { status: 500 });
  }
}
