// src/app/api/professional/financeiro/rateio/route.ts
// Dados do livro aberto + rateio para o profissional autenticado.
// Le apenas das tabelas de rateio (PoolPeriod, PoolContribution, LedgerEntry).
// Nenhum PHI: so valores agregados, contagens e a fatia do proprio profissional.

import { NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import {
  COMMISSION_RATE,
  DEFAULT_BASE_FRACTION,
  DEFAULT_MERIT_FRACTION,
  DEFAULT_MIN_VALID_CONSULTS,
  DEFAULT_MIN_RATING,
  REFUND_WINDOW_DAYS,
  SHORT_CALL_SECONDS,
  QUALITY_MIN,
  QUALITY_MAX,
  isOutsideRefundWindow,
  monthBounds,
  qualityMultiplier,
} from "@/lib/rateio";

export const dynamic = "force-dynamic";

function currentMonth(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

function defaultRules() {
  const minRating = DEFAULT_MIN_RATING;
  return {
    commissionRate: COMMISSION_RATE,
    baseFraction: DEFAULT_BASE_FRACTION,
    meritFraction: DEFAULT_MERIT_FRACTION,
    minValidConsults: DEFAULT_MIN_VALID_CONSULTS,
    minRating,
    refundWindowDays: REFUND_WINDOW_DAYS,
    shortCallSeconds: SHORT_CALL_SECONDS,
    qualityMin: QUALITY_MIN,
    qualityMax: QUALITY_MAX,
    ratingMultiplierAtMin: qualityMultiplier(minRating),
  };
}

async function resolveEffectiveRules(currency: string, month: string) {
  const defaults = defaultRules();
  const openPeriod = await db.poolPeriod.findUnique({
    where: { month_currency: { month, currency } },
    select: {
      status: true,
      baseFraction: true,
      meritFraction: true,
      minValidConsults: true,
      minRating: true,
    },
  });
  if (openPeriod?.status === "OPEN") {
    const minRating = openPeriod.minRating;
    return {
      ...defaults,
      baseFraction: openPeriod.baseFraction,
      meritFraction: openPeriod.meritFraction,
      minValidConsults: openPeriod.minValidConsults,
      minRating,
      ratingMultiplierAtMin: qualityMultiplier(minRating),
    };
  }
  return defaults;
}

async function computeMyProgress(
  professionalId: string,
  currency: string,
  rules: ReturnType<typeof defaultRules>,
) {
  const month = currentMonth();
  const { from, toExclusive } = monthBounds(month);
  const now = new Date();

  const appts = await db.appointment.findMany({
    where: {
      professionalId,
      status: "COMPLETED",
      paidAt: { not: null, gte: from, lt: toExclusive },
      currency,
    },
    select: { paidAt: true },
  });

  let validConsults = 0;
  let pendingRefundWindow = 0;
  for (const a of appts) {
    if (!a.paidAt) continue;
    if (isOutsideRefundWindow(a.paidAt, now, rules.refundWindowDays)) {
      validConsults += 1;
    } else {
      pendingRefundWindow += 1;
    }
  }

  const ratingAgg = await db.professionalReview.aggregate({
    _avg: { rating: true },
    where: { professionalId },
  });
  const avgRating = ratingAgg._avg.rating ?? null;

  const qualified =
    validConsults >= rules.minValidConsults &&
    (avgRating === null || avgRating >= rules.minRating);

  return {
    month,
    validConsults,
    pendingRefundWindow,
    avgRating,
    qualified,
  };
}

export async function GET() {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const professional = await db.professionalProfile.findUnique({
    where: { userId: ctx.userId },
    select: { id: true, currency: true },
  });
  if (!professional) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const currency = professional.currency || "BRL";
  const month = currentMonth();
  const rules = await resolveEffectiveRules(currency, month);
  const myProgress = await computeMyProgress(professional.id, currency, rules);

  const latestPeriod =
    (await db.poolPeriod.findFirst({
      where: { status: "LOCKED", currency },
      orderBy: { month: "desc" },
    })) ||
    (await db.poolPeriod.findFirst({
      where: { status: "LOCKED" },
      orderBy: { lockedAt: "desc" },
    }));

  if (!latestPeriod) {
    return NextResponse.json({ latest: null, history: [], rules, myProgress });
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
    where: {
      poolPeriodId_professionalId: {
        poolPeriodId: latestPeriod.id,
        professionalId: professional.id,
      },
    },
    select: {
      validConsults: true, qualified: true, disqualReason: true, qualityMult: true,
      score: true, baseCents: true, meritCents: true, totalCents: true, payoutStatus: true,
    },
  });

  const myContribs = await db.poolContribution.findMany({
    where: { professionalId: professional.id },
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
    rules,
    myProgress,
  });
}
