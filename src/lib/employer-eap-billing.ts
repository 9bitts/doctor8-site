import { db } from "@/lib/db";
import { buildEapUsageReport } from "@/lib/employer-eap-usage";

export async function generateMonthlyEapSnapshot(employerCompanyId: string, yearMonth?: string) {
  const now = new Date();
  const ym =
    yearMonth ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [year, month] = ym.split("-").map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  const completedInMonth = await db.appointment.count({
    where: {
      employerWorkforceMember: { employerCompanyId },
      bookingSource: "eap_corporate",
      status: "COMPLETED",
      scheduledAt: { gte: monthStart, lte: monthEnd },
    },
  });

  const report = await buildEapUsageReport(employerCompanyId);
  const monthData = report.byMonth.find((m) => m.month === ym);
  const sessionsCompleted = monthData?.completed ?? completedInMonth;
  const amountCents = monthData?.estimatedCostCents ?? sessionsCompleted * report.sessionPriceCents;
  const repasseCents = Math.round(amountCents * 0.7);

  const snapshot = await db.employerEapUsageSnapshot.upsert({
    where: {
      employerCompanyId_yearMonth: { employerCompanyId, yearMonth: ym },
    },
    create: {
      employerCompanyId,
      yearMonth: ym,
      sessionsCompleted,
      amountCents,
      repasseCents,
    },
    update: {
      sessionsCompleted,
      amountCents,
      repasseCents,
      generatedAt: new Date(),
    },
  });

  return snapshot;
}

export async function listEapSnapshots(employerCompanyId: string) {
  return db.employerEapUsageSnapshot.findMany({
    where: { employerCompanyId },
    orderBy: { yearMonth: "desc" },
    take: 24,
  });
}
