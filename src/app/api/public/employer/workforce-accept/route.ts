import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { UserRole, ConsentType } from "@prisma/client";
import { parseRegistrationPhone } from "@/lib/international-phone";
import { encryptUserPhone } from "@/lib/user-phone";
import { linkWorkforceMemberToUser, resolveWorkforceSessionQuota } from "@/lib/employer-workforce";
import { auth } from "@/lib/auth";

const passwordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9]/);

const acceptSchema = z.object({
  token: z.string().min(8),
  password: passwordSchema.optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phoneDdi: z.string().min(1).max(4).optional(),
  phoneNational: z.string().min(6).max(20).optional(),
  acceptedTerms: z.literal(true).optional(),
  acceptedPrivacy: z.literal(true).optional(),
  acceptedGdpr: z.literal(true).optional(),
});

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

  const member = await db.employerWorkforceMember.findUnique({
    where: { inviteToken: token },
    include: {
      employerCompany: {
        select: { nomeFantasia: true, slug: true },
      },
    },
  });

  if (!member || member.status === "INACTIVE") {
    return NextResponse.json({ error: "INVALID_OR_EXPIRED" }, { status: 404 });
  }

  const eap = await db.employerEapBenefit.findUnique({
    where: { employerCompanyId: member.employerCompanyId },
  });

  return NextResponse.json({
    email: member.email,
    firstName: member.firstName,
    lastName: member.lastName,
    companyName: member.employerCompany.nomeFantasia,
    sessionsPerYear: resolveWorkforceSessionQuota(member.sessionsQuota, eap?.sessionsPerEmployee ?? 6),
    alreadyActive: member.status === "ACTIVE" && Boolean(member.userId),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = acceptSchema.safeParse(body);
    if (!data.success) {
      return NextResponse.json({ error: data.error.flatten() }, { status: 400 });
    }

    const member = await db.employerWorkforceMember.findUnique({
      where: { inviteToken: data.data.token },
      include: { employerCompany: true },
    });

    if (!member || member.status === "INACTIVE") {
      return NextResponse.json({ error: { general: ["Convite inválido ou expirado"] } }, { status: 400 });
    }

    const session = await auth();
    const email = member.email.toLowerCase();
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    if (session?.user) {
      if (session.user.email?.toLowerCase() !== email) {
        return NextResponse.json(
          { error: { general: ["Faça login com o e-mail do convite."] } },
          { status: 403 },
        );
      }
      await linkWorkforceMemberToUser(member.id, session.user.id);
      return NextResponse.json({ success: true, redirectTo: "/empresas/colaborador" });
    }

    if (!data.data.password || !data.data.acceptedTerms) {
      return NextResponse.json(
        { error: { general: ["Informe senha e aceite os termos para criar conta."] } },
        { status: 400 },
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: { email: ["Conta existente. Faça login para ativar o benefício."] } },
        { status: 409 },
      );
    }

    let phoneE164: string | undefined;
    if (data.data.phoneDdi && data.data.phoneNational) {
      const phoneParsed = parseRegistrationPhone({
        phoneDdi: data.data.phoneDdi,
        phoneNational: data.data.phoneNational,
      });
      if ("error" in phoneParsed) {
        return NextResponse.json({ error: { phoneNational: ["Telefone inválido"] } }, { status: 400 });
      }
      phoneE164 = phoneParsed.e164;
    }

    const passwordHash = await bcrypt.hash(data.data.password, 12);

    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: UserRole.PATIENT,
          region: "BR",
          language: "pt",
          emailVerified: new Date(),
          phone: phoneE164 ? encryptUserPhone(phoneE164) : undefined,
        },
      });

      await tx.employerWorkforceMember.update({
        where: { id: member.id },
        data: {
          userId: newUser.id,
          status: "ACTIVE",
          activatedAt: new Date(),
          firstName: data.data.firstName ?? member.firstName,
          lastName: data.data.lastName ?? member.lastName,
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

    return NextResponse.json({
      success: true,
      userId: user.id,
      redirectTo: "/empresas/colaborador",
    }, { status: 201 });
  } catch (error) {
    console.error("[WORKFORCE ACCEPT]", error);
    return NextResponse.json({ error: { general: ["Erro ao ativar benefício"] } }, { status: 500 });
  }
}
