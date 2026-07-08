import { db } from "@/lib/db";

export type EapUsageReport = {
  periodLabel: string;
  sessionsCompleted: number;
  sessionsScheduled: number;
  sessionsQuotaTotal: number;
  utilizationPercent: number;
  estimatedCostCents: number;
  estimatedRepasseCents: number;
  sessionPriceCents: number;
  currency: string;
  byMonth: Array<{
    month: string;
    completed: number;
    estimatedCostCents: number;
  }>;
};

export async function buildEapUsageReport(employerCompanyId: string): Promise<EapUsageReport> {
  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  const [eap, workforce, completedAppts, scheduledAppts, links] = await Promise.all([
    db.employerEapBenefit.findUnique({ where: { employerCompanyId } }),
    db.employerWorkforceMember.findMany({
      where: { employerCompanyId, status: "ACTIVE" },
      select: { sessionsUsed: true, sessionsQuota: true },
    }),
    db.appointment.findMany({
      where: {
        employerWorkforceMember: { employerCompanyId },
        bookingSource: "eap_corporate",
        status: "COMPLETED",
        scheduledAt: { gte: yearStart },
      },
      select: { scheduledAt: true, priceAmount: true },
    }),
    db.appointment.count({
      where: {
        employerWorkforceMember: { employerCompanyId },
        bookingSource: "eap_corporate",
        status: { in: ["PENDING", "CONFIRMED"] },
        scheduledAt: { gte: new Date() },
      },
    }),
    db.employerLinkedPsychologist.findMany({
      where: { employerCompanyId, status: "ACTIVE" },
      select: { repassePercent: true },
    }),
  ]);

  const sessionPriceCents = eap?.sessionPriceCents ?? 12000;
  const sessionsPerEmployee = eap?.sessionsPerEmployee ?? 6;
  const sessionsQuotaTotal = workforce.reduce(
    (s, w) => s + (w.sessionsQuota ?? sessionsPerEmployee),
    0,
  );
  const sessionsUsed = workforce.reduce((s, w) => s + w.sessionsUsed, 0);
  const sessionsCompleted = completedAppts.length;

  const avgRepasse = links.length
    ? links.reduce((s, l) => s + l.repassePercent, 0) / links.length
    : 70;

  const estimatedCostCents = sessionsCompleted * sessionPriceCents;
  const estimatedRepasseCents = Math.round(estimatedCostCents * (avgRepasse / 100));

  const byMonthMap = new Map<string, { completed: number; estimatedCostCents: number }>();
  for (const appt of completedAppts) {
    const d = appt.scheduledAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const cur = byMonthMap.get(key) ?? { completed: 0, estimatedCostCents: 0 };
    cur.completed += 1;
    cur.estimatedCostCents += appt.priceAmount ?? sessionPriceCents;
    byMonthMap.set(key, cur);
  }

  const byMonth = [...byMonthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));

  return {
    periodLabel: `Ano ${new Date().getFullYear()}`,
    sessionsCompleted,
    sessionsScheduled: scheduledAppts,
    sessionsQuotaTotal,
    utilizationPercent: sessionsQuotaTotal > 0 ? Math.round((sessionsUsed / sessionsQuotaTotal) * 100) : 0,
    estimatedCostCents,
    estimatedRepasseCents,
    sessionPriceCents,
    currency: "BRL",
    byMonth,
  };
}
