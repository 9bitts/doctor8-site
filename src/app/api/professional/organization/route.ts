import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProfessional } from "@/lib/psychology-api";
import { z } from "zod";

const joinSchema = z.object({
  inviteCode: z.string().min(4),
});

export async function POST(req: NextRequest) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const body = await req.json();
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const org = await db.organization.findUnique({
    where: { inviteCode: parsed.data.inviteCode.trim() },
  });
  if (!org) {
    return NextResponse.json({ error: "ORG_NOT_FOUND" }, { status: 404 });
  }

  const existing = await db.organizationProfessional.findUnique({
    where: {
      organizationId_professionalId: {
        organizationId: org.id,
        professionalId: professional.id,
      },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "ALREADY_LINKED" }, { status: 400 });
  }

  const link = await db.organizationProfessional.create({
    data: {
      organizationId: org.id,
      professionalId: professional.id,
      status: "ACTIVE",
    },
  });

  return NextResponse.json({
    success: true,
    organization: { id: org.id, nomeFantasia: org.nomeFantasia },
    linkId: link.id,
  }, { status: 201 });
}

export async function GET() {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const links = await db.organizationProfessional.findMany({
    where: { professionalId: professional.id, status: "ACTIVE" },
    include: {
      organization: {
        select: { id: true, nomeFantasia: true, cnpj: true },
      },
    },
  });

  return NextResponse.json({
    organizations: links.map((l) => ({
      id: l.organization.id,
      nomeFantasia: l.organization.nomeFantasia,
      repassePercent: l.repassePercent,
      joinedAt: l.joinedAt.toISOString(),
    })),
  });
}
