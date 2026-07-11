import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { checkDrugInteractions, maxInteractionSeverity } from "@/lib/pharmacy/interaction-engine";
import { checkMnCatalogInteractions } from "@/lib/pharmacy/mn-interactions";
import { interactionCheckBodySchema } from "@/lib/pharmacy/types";
import { requireChartAccess, requirePharmacistProfessional } from "@/lib/pharmacy/pharmacy-api";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePharmacistProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireChartAccess(professional.id, params.id, false, session.user.id);
  if ("error" in access) return access.error;

  const checks = await db.pharmacyInteractionCheck.findMany({
    where: { patientRecordId: params.id },
    orderBy: { checkedAt: "desc" },
    take: 40,
  });

  return NextResponse.json({
    checks: checks.map((c) => ({
      id: c.id,
      medications: c.medications,
      interactions: c.interactions,
      maxSeverity: c.maxSeverity,
      recommendations: c.recommendations,
      checkedAt: c.checkedAt.toISOString(),
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePharmacistProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireChartAccess(professional.id, params.id, true, session.user.id);
  if ("error" in access) return access.error;

  const body = await req.json();
  const parsed = interactionCheckBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const ruleInteractions = checkDrugInteractions(parsed.data.medications);
  const mnInteractions = await checkMnCatalogInteractions(parsed.data.medications);
  const interactions = [...ruleInteractions, ...mnInteractions];
  const severity = maxInteractionSeverity(interactions);

  const check = await db.pharmacyInteractionCheck.create({
    data: {
      patientRecordId: params.id,
      professionalId: professional.id,
      medications: parsed.data.medications as Prisma.InputJsonValue,
      interactions: interactions as Prisma.InputJsonValue,
      maxSeverity: severity,
      recommendations: parsed.data.recommendations ?? null,
    },
  });

  return NextResponse.json(
    {
      id: check.id,
      interactions: check.interactions,
      maxSeverity: check.maxSeverity,
      checkedAt: check.checkedAt.toISOString(),
    },
    { status: 201 },
  );
}
