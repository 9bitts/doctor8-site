import { NextRequest, NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";
import { z } from "zod";
import { sendOccupationalPhysicianInvite } from "@/lib/email";

const inviteSchema = z.object({
  email: z.string().email(),
  fullName: z.string().max(200).optional(),
  crm: z.string().max(30).optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const parsed = inviteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const company = await db.employerCompany.findUnique({
    where: { id: ctx.employerCompanyId },
    select: { nomeFantasia: true },
  });

  await db.employerPcmsoConfig.upsert({
    where: { employerCompanyId: ctx.employerCompanyId },
    create: {
      employerCompanyId: ctx.employerCompanyId,
      coordinatorName: parsed.data.fullName,
      coordinatorEmail: email,
      coordinatorCrm: parsed.data.crm,
    },
    update: {
      coordinatorName: parsed.data.fullName,
      coordinatorEmail: email,
      coordinatorCrm: parsed.data.crm,
    },
  });

  const existing = await db.employerOccupationalPhysician.findUnique({
    where: {
      employerCompanyId_email: {
        employerCompanyId: ctx.employerCompanyId,
        email,
      },
    },
  });

  if (existing?.status === "ACTIVE" && existing.userId) {
    return NextResponse.json({ error: "ALREADY_ACTIVE" }, { status: 400 });
  }

  await db.employerOccupationalPhysician.upsert({
    where: {
      employerCompanyId_email: {
        employerCompanyId: ctx.employerCompanyId,
        email,
      },
    },
    create: {
      employerCompanyId: ctx.employerCompanyId,
      email,
      fullName: parsed.data.fullName,
      crm: parsed.data.crm,
      status: "INVITED",
      inviteToken: token,
      expiresAt,
    },
    update: {
      fullName: parsed.data.fullName ?? undefined,
      crm: parsed.data.crm ?? undefined,
      status: "INVITED",
      inviteToken: token,
      expiresAt,
      userId: null,
      joinedAt: null,
    },
  });

  try {
    await sendOccupationalPhysicianInvite({
      email,
      companyName: company?.nomeFantasia || "Empresa",
      token,
      language: "pt",
    });
  } catch (emailErr) {
    console.error("[OCCUPATIONAL PHYSICIAN INVITE EMAIL]", emailErr);
  }

  return NextResponse.json({
    success: true,
    message: "Convite enviado ao médico coordenador.",
  });
}

export async function GET() {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST", "HR", "VIEWER"]);
  if ("error" in ctx) return ctx.error;

  const link = await db.employerOccupationalPhysician.findFirst({
    where: {
      employerCompanyId: ctx.employerCompanyId,
      status: { in: ["INVITED", "ACTIVE"] },
    },
    orderBy: { invitedAt: "desc" },
    select: {
      email: true,
      fullName: true,
      crm: true,
      status: true,
      invitedAt: true,
      joinedAt: true,
      expiresAt: true,
    },
  });

  return NextResponse.json({ link });
}
