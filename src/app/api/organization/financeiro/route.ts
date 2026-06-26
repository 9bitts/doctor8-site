import { NextRequest, NextResponse } from "next/server";
import { requireOrganization, getOrganizationProfessionalIds } from "@/lib/organization-auth";
import { db } from "@/lib/db";

const COMMISSION_RATE = 0.15;

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
    case "this_month":
    default:
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  }
}

export async function GET(req: NextRequest) {
  const ctx = await requireOrganization();
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "this_month";
  const { from, to } = getPeriodDates(period);

  const links = await db.organizationProfessional.findMany({
    where: { organizationId: ctx.organizationId, status: "ACTIVE" },
    include: {
      professional: {
        select: { id: true, firstName: true, lastName: true, specialty: true },
      },
    },
  });

  const professionalIds = links.map((l) => l.professionalId);
  if (professionalIds.length === 0) {
    return NextResponse.json({
      period,
      currency: ctx.organization.currency,
      totalGrossCents: 0,
      totalClinicCents: 0,
      totalProfessionalCents: 0,
      byProfessional: [],
      transactions: [],
    });
  }

  const repasseMap = new Map(
    links.map((l) => [l.professionalId, l.repassePercent]),
  );

  const appointments = await db.appointment.findMany({
    where: {
      professionalId: { in: professionalIds },
      status: "COMPLETED",
      paidAt: { not: null },
      scheduledAt: { gte: from, lte: to },
    },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      professional: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { scheduledAt: "desc" },
  });

  type ProfSummary = {
    professionalId: string;
    name: string;
    grossCents: number;
    professionalCents: number;
    clinicCents: number;
    count: number;
    repassePercent: number;
  };

  const byProf = new Map<string, ProfSummary>();
  const transactions: {
    id: string;
    date: string;
    professionalName: string;
    patientInitials: string;
    grossCents: number;
    professionalCents: number;
    clinicCents: number;
    currency: string;
  }[] = [];

  for (const appt of appointments) {
    if (!appt.professionalId || !appt.professional) continue;
    const gross = appt.priceAmount || 0;
    const afterCommission = Math.round(gross * (1 - COMMISSION_RATE));
    const repassePct = repasseMap.get(appt.professionalId) ?? 70;
    const professionalCents = Math.round(afterCommission * (repassePct / 100));
    const clinicCents = afterCommission - professionalCents;

    const profId = appt.professionalId;
    const existing = byProf.get(profId) || {
      professionalId: profId,
      name: `Dr. ${appt.professional.firstName} ${appt.professional.lastName}`,
      grossCents: 0,
      professionalCents: 0,
      clinicCents: 0,
      count: 0,
      repassePercent: repassePct,
    };
    existing.grossCents += gross;
    existing.professionalCents += professionalCents;
    existing.clinicCents += clinicCents;
    existing.count += 1;
    byProf.set(profId, existing);

    const p = appt.patient;
    transactions.push({
      id: appt.id,
      date: appt.scheduledAt.toISOString(),
      professionalName: existing.name,
      patientInitials: p ? `${p.firstName.charAt(0)}${p.lastName.charAt(0)}` : "??",
      grossCents: gross,
      professionalCents,
      clinicCents,
      currency: appt.currency || ctx.organization.currency,
    });
  }

  const summaries = Array.from(byProf.values());
  const totalGrossCents = summaries.reduce((s, p) => s + p.grossCents, 0);
  const totalProfessionalCents = summaries.reduce((s, p) => s + p.professionalCents, 0);
  const totalClinicCents = summaries.reduce((s, p) => s + p.clinicCents, 0);

  return NextResponse.json({
    period,
    from: from.toISOString(),
    to: to.toISOString(),
    currency: ctx.organization.currency,
    commissionRate: COMMISSION_RATE,
    totalGrossCents,
    totalProfessionalCents,
    totalClinicCents,
    byProfessional: summaries,
    transactions,
  });
}
