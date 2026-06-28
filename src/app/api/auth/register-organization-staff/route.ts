import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { UserRole, UserRegion, ConsentType } from "@prisma/client";

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
  acceptedTerms: z.literal(true),
  acceptedPrivacy: z.literal(true),
  acceptedGdpr: z.literal(true),
});

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const invite = await db.organizationInvite.findUnique({
    where: { token },
    include: {
      organization: { select: { nomeFantasia: true, razaoSocial: true } },
    },
  });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "INVALID_OR_EXPIRED" }, { status: 404 });
  }

  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    organizationName: invite.organization.nomeFantasia,
    expiresAt: invite.expiresAt.toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerStaffSchema.safeParse(body);
    if (!data.success) {
      return NextResponse.json({ error: data.error.flatten().fieldErrors }, { status: 400 });
    }

    const invite = await db.organizationInvite.findUnique({
      where: { token: data.data.token },
      include: { organization: true },
    });

    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: { general: ["Convite inválido ou expirado"] } }, { status: 400 });
    }

    const email = invite.email.toLowerCase();
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: { email: ["Este e-mail já possui conta. Faça login e aceite o convite."] } },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(data.data.password, 12);
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: UserRole.ORGANIZATION,
          region: UserRegion.BR,
          language: "pt",
          emailVerified: new Date(),
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: invite.organizationId,
          userId: newUser.id,
          role: invite.role,
          status: "ACTIVE",
          invitedAt: invite.createdAt,
        },
      });

      await tx.organizationInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
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
    console.error("[ORG STAFF REGISTER]", error);
    return NextResponse.json({ error: { general: ["Erro ao criar conta"] } }, { status: 500 });
  }
}
