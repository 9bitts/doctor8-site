import { NextRequest, NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { canManageEmployerTeam } from "@/lib/employer-auth";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";
import { z } from "zod";
import { sendEmployerStaffInvite } from "@/lib/email";

export async function GET() {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const [staff, pendingInvites] = await Promise.all([
    db.employerMember.findMany({
      where: { employerCompanyId: ctx.employerCompanyId },
      include: {
        user: { select: { id: true, email: true, lastLoginAt: true } },
      },
      orderBy: { joinedAt: "asc" },
    }),
    db.employerInvite.findMany({
      where: {
        employerCompanyId: ctx.employerCompanyId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
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
    pendingInvites: pendingInvites.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      expiresAt: i.expiresAt.toISOString(),
      createdAt: i.createdAt.toISOString(),
    })),
    canManageTeam: canManageEmployerTeam(ctx.memberRole),
  });
}

const inviteStaffSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "SST", "HR", "VIEWER"]),
});

export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN"]);
  if ("error" in ctx) return ctx.error;

  const parsed = inviteStaffSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const existingUser = await db.user.findUnique({ where: { email } });

  if (existingUser) {
    const existingMember = await db.employerMember.findUnique({
      where: {
        employerCompanyId_userId: {
          employerCompanyId: ctx.employerCompanyId,
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

  const company = await db.employerCompany.findUnique({
    where: { id: ctx.employerCompanyId },
    select: { nomeFantasia: true },
  });

  await db.employerInvite.create({
    data: {
      employerCompanyId: ctx.employerCompanyId,
      email,
      role: parsed.data.role,
      token,
      expiresAt,
    },
  });

  try {
    await sendEmployerStaffInvite({
      email,
      companyName: company?.nomeFantasia || "Empresa",
      role: parsed.data.role,
      token,
      language: "pt",
    });
  } catch (emailErr) {
    console.error("[EMPLOYER INVITE EMAIL]", emailErr);
  }

  return NextResponse.json({ success: true, message: "Convite enviado por e-mail." }, { status: 201 });
}
