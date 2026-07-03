// src/app/api/professional/financeiro/rateio/route.ts
// Dados do livro aberto + rateio para o profissional autenticado (health, psychoanalyst, integrative).
// Le apenas das tabelas de rateio (PoolPeriod, PoolContribution, LedgerEntry).
// Nenhum PHI: so valores agregados, contagens e a fatia do proprio profissional.

import { NextResponse } from "next/server";
import { requireAuth, isApiError } from "@/lib/api-auth";
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

type RateioProviderKind = "HEALTH" | "PSYCHOANALYST" | "INTEGRATIVE_THERAPIST";

type RateioProviderContext = {
  kind: RateioProviderKind;
  providerId: string;
  currency: string;
};

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

async function resolveRateioProvider(userId: string, role: string): Promise<RateioProviderContext | null> {
  if (role === "PROFESSIONAL") {
    const profile = await db.professionalProfile.findUnique({
      where: { userId },
      select: { id: true, currency: true },
    });
    if (!profile) return null;
    return { kind: "HEALTH", providerId: profile.id, currency: profile.currency || "BRL" };
  }
  if (role === "PSYCHOANALYST") {
    const profile = await db.psychoanalystProfile.findUnique({
      where: { userId },
      select: { id: true, currency: true },
    });
    if (!profile) return null;
    return { kind: "PSYCHOANALYST", providerId: profile.id, currency: profile.currency || "BRL" };
  }
  if (role === "INTEGRATIVE_THERAPIST") {
    const profile = await db.integrativeTherapistProfile.findUnique({
      where: { userId },
      select: { id: true, currency: true },
    });
    if (!profile) return null;
    return { kind: "INTEGRATIVE_THERAPIST", providerId: profile.id, currency: profile.currency || "BRL" };
  }
  return null;
}

function appointmentProviderFilter(kind: RateioProviderKind, providerId: string) {
  if (kind === "PSYCHOANALYST") return { psychoanalystId: providerId };
  if (kind === "INTEGRATIVE_THERAPIST") return { integrativeTherapistId: providerId };
  return { professionalId: providerId };
}

async function computeMyProgress(
  provider: RateioProviderContext,
  rules: ReturnType<typeof defaultRules>,
) {
  const month = currentMonth();
  const { from, toExclusive } = monthBounds(month);
  const now = new Date();

  const appts = await db.appointment.findMany({
    where: {
      ...appointmentProviderFilter(provider.kind, provider.providerId),
      status: "COMPLETED",
      paidAt: { not: null, gte: from, lt: toExclusive },
      currency: provider.currency,
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

  let avgRating: number | null = null;
  if (provider.kind === "HEALTH") {
    const ratingAgg = await db.professionalReview.aggregate({
      _avg: { rating: true },
      where: { professionalId: provider.providerId },
    });
    avgRating = ratingAgg._avg.rating ?? null;
  } else if (provider.kind === "PSYCHOANALYST") {
    const ratingAgg = await db.psychoanalystReview.aggregate({
      _avg: { rating: true },
      where: { psychoanalystId: provider.providerId },
    });
    avgRating = ratingAgg._avg.rating ?? null;
  }

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

async function findMineContribution(poolPeriodId: string, provider: RateioProviderContext) {
  if (provider.kind === "PSYCHOANALYST") {
    return db.poolContribution.findUnique({
      where: {
        poolPeriodId_psychoanalystId: {
          poolPeriodId,
          psychoanalystId: provider.providerId,
        },
      },
      select: {
        validConsults: true, qualified: true, disqualReason: true, qualityMult: true,
        score: true, baseCents: true, meritCents: true, totalCents: true, payoutStatus: true,
      },
    });
  }
  if (provider.kind === "INTEGRATIVE_THERAPIST") {
    return db.poolContribution.findUnique({
      where: {
        poolPeriodId_integrativeTherapistId: {
          poolPeriodId,
          integrativeTherapistId: provider.providerId,
        },
      },
      select: {
        validConsults: true, qualified: true, disqualReason: true, qualityMult: true,
        score: true, baseCents: true, meritCents: true, totalCents: true, payoutStatus: true,
      },
    });
  }
  return db.poolContribution.findUnique({
    where: {
      poolPeriodId_professionalId: {
        poolPeriodId,
        professionalId: provider.providerId,
      },
    },
    select: {
      validConsults: true, qualified: true, disqualReason: true, qualityMult: true,
      score: true, baseCents: true, meritCents: true, totalCents: true, payoutStatus: true,
    },
  });
}

function contributionHistoryWhere(provider: RateioProviderContext) {
  if (provider.kind === "PSYCHOANALYST") return { psychoanalystId: provider.providerId };
  if (provider.kind === "INTEGRATIVE_THERAPIST") return { integrativeTherapistId: provider.providerId };
  return { professionalId: provider.providerId };
}

export async function GET() {
  const ctx = await requireAuth(["PROFESSIONAL", "PSYCHOANALYST", "INTEGRATIVE_THERAPIST"]);
  if (isApiError(ctx)) return ctx.error;

  const provider = await resolveRateioProvider(ctx.userId, ctx.session.user.role);
  if (!provider) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { currency } = provider;
  const month = currentMonth();
  const rules = await resolveEffectiveRules(currency, month);
  const myProgress = await computeMyProgress(provider, rules);

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

  const mineRow = await findMineContribution(latestPeriod.id, provider);

  const myContribs = await db.poolContribution.findMany({
    where: contributionHistoryWhere(provider),
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
