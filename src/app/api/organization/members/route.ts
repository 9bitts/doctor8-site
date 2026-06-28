import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrganization, canManageTeam } from "@/lib/organization-auth";
import { randomBytes } from "crypto";
import { z } from "zod";
import { sendOrganizationStaffInvite } from "@/lib/email";

export async function GET() {
  const ctx = await requireOrganization();
  if ("error" in ctx) return ctx.error;

  const [staff, professionals] = await Promise.all([
    db.organizationMember.findMany({
      where: { organizationId: ctx.organizationId },
      include: {
        user: { select: { id: true, email: true, lastLoginAt: true } },
      },
      orderBy: { joinedAt: "asc" },
    }),
    db.organizationProfessional.findMany({
      where: { organizationId: ctx.organizationId },
      include: {
        professional: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialty: true,
            licenseNumber: true,
            user: { select: { email: true } },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    }),
  ]);

  return NextResponse.json({
    staff: staff.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt.toISOString(),
      lastLoginAt: m.user.lastLoginAt?.toISOString() ?? null,
    })),
    professionals: professionals.map((p) => ({
      id: p.id,
      professionalId: p.professionalId,
      name: `${p.professional.firstName} ${p.professional.lastName}`,
      specialty: p.professional.specialty,
      licenseNumber: p.professional.licenseNumber,
      email: p.professional.user.email,
      repassePercent: p.repassePercent,
      status: p.status,
      joinedAt: p.joinedAt.toISOString(),
    })),
    inviteCode: ctx.organization.inviteCode,
    canManageTeam: canManageTeam(ctx.memberRole),
  });
}

const inviteStaffSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "RECEPTIONIST", "FINANCE", "HR", "ACCOUNTANT"]),
});

export async function POST(req: NextRequest) {
  const ctx = await requireOrganization(["OWNER", "ADMIN"]);
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const parsed = inviteStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const existingUser = await db.user.findUnique({ where: { email } });

  if (existingUser) {
    const existingMember = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: ctx.organizationId,
          userId: existingUser.id,
        },
      },
    });
    if (existingMember) {
      return NextResponse.json({ error: "ALREADY_MEMBER" }, { status: 400 });
    }
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const org = await db.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { nomeFantasia: true },
  });

  await db.organizationInvite.create({
    data: {
      organizationId: ctx.organizationId,
      email,
      role: parsed.data.role,
      token,
      expiresAt,
    },
  });

  try {
    await sendOrganizationStaffInvite({
      email,
      organizationName: org?.nomeFantasia || "Clínica",
      role: parsed.data.role,
      token,
      language: "pt",
    });
  } catch (emailErr) {
    console.error("[ORG INVITE EMAIL]", emailErr);
  }

  return NextResponse.json({
    success: true,
    message: "Convite enviado por e-mail.",
  }, { status: 201 });
}

const repasseSchema = z.object({
  professionalId: z.string(),
  repassePercent: z.number().min(0).max(100),
});

export async function PATCH(req: NextRequest) {
  const ctx = await requireOrganization(["OWNER", "ADMIN", "FINANCE"]);
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const parsed = repasseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const link = await db.organizationProfessional.findUnique({
    where: {
      organizationId_professionalId: {
        organizationId: ctx.organizationId,
        professionalId: parsed.data.professionalId,
      },
    },
  });
  if (!link) {
    return NextResponse.json({ error: "Professional not found" }, { status: 404 });
  }

  await db.organizationProfessional.update({
    where: { id: link.id },
    data: { repassePercent: parsed.data.repassePercent },
  });

  return NextResponse.json({ success: true });
}
