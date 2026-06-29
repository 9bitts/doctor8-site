import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePsychoanalyst } from "@/lib/psychoanalyst-api";
import {
  findOrganizationByInviteCode,
  linkProviderToOrganization,
} from "@/lib/organization-providers";
import { db } from "@/lib/db";

const joinSchema = z.object({
  inviteCode: z.string().min(4),
});

export async function POST(req: NextRequest) {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const org = await findOrganizationByInviteCode(parsed.data.inviteCode);
  if (!org) {
    return NextResponse.json({ error: "ORG_NOT_FOUND" }, { status: 404 });
  }

  const result = await linkProviderToOrganization({
    organizationId: org.id,
    providerType: "PSYCHOANALYST",
    providerProfileId: ctx.psychoanalyst.id,
  });
  if (result === "ALREADY_LINKED") {
    return NextResponse.json({ error: "ALREADY_LINKED" }, { status: 400 });
  }

  return NextResponse.json(
    { success: true, organization: org, linkId: result.id },
    { status: 201 },
  );
}

export async function GET() {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx) return ctx.error;

  const links = await db.organizationLinkedProvider.findMany({
    where: {
      providerProfileId: ctx.psychoanalyst.id,
      providerType: "PSYCHOANALYST",
      status: "ACTIVE",
    },
    include: {
      organization: { select: { id: true, nomeFantasia: true, cnpj: true } },
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
