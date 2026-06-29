// src/app/api/professional/financeiro/rateio/route.ts
// Dados do livro aberto + rateio para o profissional autenticado.
// Le apenas das tabelas de rateio (PoolPeriod, PoolContribution, LedgerEntry).
// Nenhum PHI: so valores agregados, contagens e a fatia do proprio profissional.

import { NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const professional = await db.professionalProfile.findUnique({
    where: { userId: ctx.userId },
    select: { id: true, currency: true },
  });
  if (!professional) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const latestPeriod =
    (await db.poolPeriod.findFirst({
      where: { status: "LOCKED", currency: professional.currency || "BRL" },
      orderBy: { month: "desc" },
    })) ||
    (await db.poolPeriod.findFirst({
      where: { status: "LOCKED" },
      orderBy: { lockedAt: "desc" },
    }));

  if (!latestPeriod) {
    return NextResponse.json({ latest: null, history: [] });
  }

  const costGroups = await db.ledgerEntry.groupBy({
    by: ["type", "category", "source"],
    where: {
      poolPeriodId: latestPeriod.id,
      type: { in: ["COST_FIXED", "COST_USAGE"] },
    },
    _sum: { amountCents: true },
  });
  const costBreakdown = costGroups
    .map((g) => ({
      type: g.type as "COST_FIXED" | "COST_USAGE",
      category: (g.category as string) || "OTHER",
      source: g.source as string,
      amountCents: g._sum.amountCents ?? 0,
    }))
    .filter((c) => c.amountCents > 0)
    .sort((a, b) => b.amountCents - a.amountCents);

  const professionalsCount = await db.poolContribution.count({
    where: { poolPeriodId: latestPeriod.id, qualified: true },
  });

  const mineRow = await db.poolContribution.findUnique({
    where: { poolPeriodId_professionalId: { poolPeriodId: latestPeriod.id, professionalId: ctx.professional.id } },
    select: {
      validConsults: true, qualified: true, disqualReason: true, qualityMult: true,
      score: true, baseCents: true, meritCents: true, totalCents: true, payoutStatus: true,
    },
  });

  const myContribs = await db.poolContribution.findMany({
    where: { professionalId: ctx.professional.id },
    select: {
      totalCents: true, qualified: true,
      poolPeriod: { select: { month: true, currency: true, poolCents: true, status: true } },
    },
    orderBy: { poolPeriod: { month: "desc" } },
  });
  const history = myContribs
    .filter((c) => c.poolPeriod.status === "LOCKED" || c.poolPeriod.status === "PAID")
    .map((c) => ({
      month: c.poolPeriod.month,
      currency: c.poolPeriod.currency,
      poolCents: c.poolPeriod.poolCents,
      totalCents: c.totalCents,
      qualified: c.qualified,
    }));

  return NextResponse.json({
    latest: {
      month: latestPeriod.month,
      currency: latestPeriod.currency,
      commissionCents: latestPeriod.commissionCents,
      costFixedCents: latestPeriod.costFixedCents,
      costUsageCents: latestPeriod.costUsageCents,
      poolCents: latestPeriod.poolCents,
      baseFraction: latestPeriod.baseFraction,
      meritFraction: latestPeriod.meritFraction,
      lockedAt: latestPeriod.lockedAt ? latestPeriod.lockedAt.toISOString() : null,
      professionalsCount,
      costBreakdown,
      mine: mineRow,
    },
    history,
  });
}
