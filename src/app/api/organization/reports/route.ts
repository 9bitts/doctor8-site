import { NextRequest, NextResponse } from "next/server";
import { requireOrganizationApi, isApiError } from "@/lib/api-auth";
import { getOrganizationProfessionalIds } from "@/lib/organization-auth";

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

  const professionalIds = await getOrganizationProfessionalIds(ctx.organizationId);

  const professionals = await db.organizationProfessional.findMany({
    where: { organizationId: ctx.organizationId, status: "ACTIVE" },
    include: {
      professional: { select: { id: true, firstName: true, lastName: true, specialty: true } },
    },
  });

  const profMap = new Map(professionals.map((p) => [p.professionalId, p.professional]));

  const appointments = professionalIds.length > 0
    ? await db.appointment.findMany({
        where: {
          professionalId: { in: professionalIds },
          scheduledAt: { gte: from, lte: to },
          status: { not: "CANCELLED" },
        },
        select: {
          id: true,
          professionalId: true,
          status: true,
          type: true,
          priceAmount: true,
          paidAt: true,
          scheduledAt: true,
        },
      })
    : [];

  type ProfStats = {
    professionalId: string;
    name: string;
    specialty: string;
    total: number;
    completed: number;
    noShow: number;
    cancelled: number;
    revenueCents: number;
  };

  const byProfessional = new Map<string, ProfStats>();
  const bySpecialty = new Map<string, { specialty: string; count: number; revenueCents: number }>();
  const byType = new Map<string, { type: string; count: number }>();

  for (const p of professionals) {
    byProfessional.set(p.professionalId, {
      professionalId: p.professionalId,
      name: `${p.professional.firstName} ${p.professional.lastName}`,
      specialty: p.professional.specialty || "?",
      total: 0,
      completed: 0,
      noShow: 0,
      cancelled: 0,
      revenueCents: 0,
    });
  }

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

    if (!a.professionalId) continue;
    const prof = byProfessional.get(a.professionalId);
    const specialty = profMap.get(a.professionalId)?.specialty || "?";

    const specStat = bySpecialty.get(specialty) || { specialty, count: 0, revenueCents: 0 };
    specStat.count++;
    if (a.paidAt && a.priceAmount) specStat.revenueCents += a.priceAmount;
    bySpecialty.set(specialty, specStat);

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
      professionalCount: professionals.length,
    },
    byProfessional: Array.from(byProfessional.values()).sort((a, b) => b.completed - a.completed),
    bySpecialty: Array.from(bySpecialty.values()).sort((a, b) => b.revenueCents - a.revenueCents),
    byType: Array.from(byType.values()),
  });
}
