import { NextRequest, NextResponse } from "next/server";
import { requireOrganizationApi, isApiError } from "@/lib/api-auth";
import {
  getOrganizationProviderScopeIds,
  buildAppointmentOrWhere,
  listOrganizationProviders,
  resolveAppointmentProviderName,
  scopeHasProviders,
} from "@/lib/organization-providers";
import { db } from "@/lib/db";

function getPeriodDates(period: string): { from: Date; to: Date } {
  const now = new Date();
  switch (period) {
    case "last_month": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { from, to };
    }
    case "3_months":
      return { from: new Date(now.getFullYear(), now.getMonth() - 2, 1), to: now };
    case "this_year":
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    default:
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  }
}

export async function GET(req: NextRequest) {
  const ctx = await requireOrganizationApi();
  if (isApiError(ctx)) return ctx.error;

  const period = req.nextUrl.searchParams.get("period") || "this_month";
  const { from, to } = getPeriodDates(period);

  const scope = await getOrganizationProviderScopeIds(ctx.organizationId);
  const orClauses = buildAppointmentOrWhere(scope);
  const providers = await listOrganizationProviders(ctx.organizationId);

  if (!scopeHasProviders(scope) || orClauses.length === 0) {
    return NextResponse.json({
      period,
      from: from.toISOString(),
      to: to.toISOString(),
      currency: ctx.organization.currency,
      overview: {
        totalAppointments: 0,
        completedCount: 0,
        noShowCount: 0,
        completionRate: 0,
        noShowRate: 0,
        totalRevenueCents: 0,
        professionalCount: providers.filter((p) => p.status === "ACTIVE").length,
      },
      byProfessional: [],
      bySpecialty: [],
      byType: [],
    });
  }

  const appointments = await db.appointment.findMany({
    where: {
      OR: orClauses,
      scheduledAt: { gte: from, lte: to },
      status: { not: "CANCELLED" },
    },
    select: {
      id: true,
      status: true,
      type: true,
      priceAmount: true,
      paidAt: true,
      scheduledAt: true,
      professionalId: true,
      psychoanalystId: true,
      integrativeTherapistId: true,
      professional: { select: { id: true, firstName: true, lastName: true, specialty: true } },
      psychoanalyst: { select: { id: true, firstName: true, lastName: true } },
      integrativeTherapist: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  type ProfStats = {
    scopeKey: string;
    name: string;
    specialty: string;
    total: number;
    completed: number;
    noShow: number;
    cancelled: number;
    revenueCents: number;
  };

  const byProfessional = new Map<string, ProfStats>();
  for (const p of providers.filter((pr) => pr.status === "ACTIVE")) {
    byProfessional.set(p.scopeKey, {
      scopeKey: p.scopeKey,
      name: p.name,
      specialty: p.specialty || "?",
      total: 0,
      completed: 0,
      noShow: 0,
      cancelled: 0,
      revenueCents: 0,
    });
  }

  const bySpecialty = new Map<string, { specialty: string; count: number; revenueCents: number }>();
  const byType = new Map<string, { type: string; count: number }>();

  let totalAppointments = 0;
  let completedCount = 0;
  let noShowCount = 0;
  let totalRevenue = 0;

  for (const a of appointments) {
    totalAppointments++;
    if (a.status === "COMPLETED") completedCount++;
    if (a.status === "NO_SHOW") noShowCount++;
    if (a.paidAt && a.priceAmount) totalRevenue += a.priceAmount;

    const typeKey = a.type === "TELECONSULT" ? "Teleconsulta" : "Presencial";
    const typeStat = byType.get(typeKey) || { type: typeKey, count: 0 };
    typeStat.count++;
    byType.set(typeKey, typeStat);

    const provider = resolveAppointmentProviderName(a);
    if (!provider) continue;

    const specStat = bySpecialty.get(provider.specialty) || {
      specialty: provider.specialty,
      count: 0,
      revenueCents: 0,
    };
    specStat.count++;
    if (a.paidAt && a.priceAmount) specStat.revenueCents += a.priceAmount;
    bySpecialty.set(provider.specialty, specStat);

    const prof = byProfessional.get(provider.scopeKey);
    if (prof) {
      prof.total++;
      if (a.status === "COMPLETED") prof.completed++;
      if (a.status === "NO_SHOW") prof.noShow++;
      if (a.paidAt && a.priceAmount) prof.revenueCents += a.priceAmount;
    }
  }

  const completionRate = totalAppointments > 0
    ? Math.round((completedCount / totalAppointments) * 100)
    : 0;
  const noShowRate = totalAppointments > 0
    ? Math.round((noShowCount / totalAppointments) * 100)
    : 0;

  return NextResponse.json({
    period,
    from: from.toISOString(),
    to: to.toISOString(),
    currency: ctx.organization.currency,
    overview: {
      totalAppointments,
      completedCount,
      noShowCount,
      completionRate,
      noShowRate,
      totalRevenueCents: totalRevenue,
      professionalCount: providers.filter((p) => p.status === "ACTIVE").length,
    },
    byProfessional: Array.from(byProfessional.values()).sort((a, b) => b.completed - a.completed),
    bySpecialty: Array.from(bySpecialty.values()).sort((a, b) => b.revenueCents - a.revenueCents),
    byType: Array.from(byType.values()),
  });
}
