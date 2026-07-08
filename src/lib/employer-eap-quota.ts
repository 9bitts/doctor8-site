import { db } from "@/lib/db";

export function currentQuotaYear(): number {
  return new Date().getFullYear();
}

/** Resets workforce session counters when the calendar year changes. */
export async function ensureEmployerEapQuotaYear(employerCompanyId: string): Promise<void> {
  const year = currentQuotaYear();
  const benefit = await db.employerEapBenefit.findUnique({
    where: { employerCompanyId },
    select: { quotaYear: true },
  });
  if (!benefit) return;
  if (benefit.quotaYear >= year) return;

  await db.$transaction([
    db.employerWorkforceMember.updateMany({
      where: { employerCompanyId },
      data: { sessionsUsed: 0 },
    }),
    db.employerEapBenefit.update({
      where: { employerCompanyId },
      data: { quotaYear: year },
    }),
  ]);
}

/** Cron job: reset EAP quotas for all companies behind the current year. */
export async function resetAllEmployerEapQuotas(): Promise<{ companies: number; members: number }> {
  const year = currentQuotaYear();
  const stale = await db.employerEapBenefit.findMany({
    where: { quotaYear: { lt: year } },
    select: { employerCompanyId: true },
  });

  if (stale.length === 0) return { companies: 0, members: 0 };

  let members = 0;
  for (const row of stale) {
    const result = await db.employerWorkforceMember.updateMany({
      where: { employerCompanyId: row.employerCompanyId },
      data: { sessionsUsed: 0 },
    });
    members += result.count;
    await db.employerEapBenefit.update({
      where: { employerCompanyId: row.employerCompanyId },
      data: { quotaYear: year },
    });
  }

  return { companies: stale.length, members };
}
