import { NextRequest, NextResponse } from "next/server";
import { requireOrganizationApi, isApiError } from "@/lib/api-auth";
import { canManageTeam } from "@/lib/organization-auth";
import { listOrganizationProviders, parseProviderScopeKey } from "@/lib/organization-providers";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";
import { z } from "zod";
import { sendOrganizationStaffInvite } from "@/lib/email";

export async function GET() {
  const ctx = await requireOrganizationApi();
  if (isApiError(ctx)) return ctx.error;

  const [staff, providers] = await Promise.all([
    db.organizationMember.findMany({
      where: { organizationId: ctx.organizationId },
      include: {
        user: { select: { id: true, email: true, lastLoginAt: true } },
      },
      orderBy: { joinedAt: "asc" },
    }),
    listOrganizationProviders(ctx.organizationId),
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
    professionals: providers.map((p) => ({
      id: p.scopeKey,
      professionalId: p.providerProfileId,
      providerType: p.providerType,
      name: p.name,
      specialty: p.specialty,
      licenseNumber: "",
      email: "",
      repassePercent: p.repassePercent,
      status: p.status,
      joinedAt: p.joinedAt,
    })),
    providers,
    inviteCode: ctx.organization.inviteCode,
    canManageTeam: canManageTeam(ctx.memberRole),
  });
}

const inviteStaffSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "RECEPTIONIST", "FINANCE", "HR", "ACCOUNTANT"]),
});

export async function POST(req: NextRequest) {
  const ctx = await requireOrganizationApi(["OWNER", "ADMIN"]);
  if (isApiError(ctx)) return ctx.error;

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
  professionalId: z.string().optional(),
  scopeKey: z.string().optional(),
  providerType: z.enum(["HEALTH", "PSYCHOANALYST", "INTEGRATIVE_THERAPIST"]).optional(),
  repassePercent: z.number().min(0).max(100),
}).refine(
  (d) => Boolean(d.scopeKey || d.professionalId),
  { message: "scopeKey or professionalId required" },
);

export async function PATCH(req: NextRequest) {
  const ctx = await requireOrganizationApi(["OWNER", "ADMIN", "FINANCE"]);
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json();
  const parsed = repasseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsedScope = parsed.data.scopeKey
    ? parseProviderScopeKey(parsed.data.scopeKey)
    : parsed.data.professionalId
      ? {
          providerType: parsed.data.providerType ?? ("HEALTH" as const),
          providerProfileId: parsed.data.professionalId,
        }
      : null;

  if (!parsedScope) {
    return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
  }

  if (parsedScope.providerType === "HEALTH") {
    const link = await db.organizationProfessional.findUnique({
      where: {
        organizationId_professionalId: {
          organizationId: ctx.organizationId,
          professionalId: parsedScope.providerProfileId,
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
  } else {
    const link = await db.organizationLinkedProvider.findUnique({
      where: {
        organizationId_providerType_providerProfileId: {
          organizationId: ctx.organizationId,
          providerType: parsedScope.providerType,
          providerProfileId: parsedScope.providerProfileId,
        },
      },
    });
    if (!link) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }
    await db.organizationLinkedProvider.update({
      where: { id: link.id },
      data: { repassePercent: parsed.data.repassePercent },
    });
  }

  return NextResponse.json({ success: true });
}
