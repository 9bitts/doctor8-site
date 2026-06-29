import { db } from "@/lib/db";

export type ProfessionalDashboardInsights = {
  staleInvites: number;
  chartsNeedingInvite: number;
  pendingInvites: number;
  unlinkedWithEmail: number;
};

/** Actionable counts for the professional home dashboard. */
export async function getProfessionalDashboardInsights(
  professionalId: string,
): Promise<ProfessionalDashboardInsights> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [staleInvites, chartsNeedingInvite, pendingInvites, unlinkedWithEmail] =
    await Promise.all([
      db.patientChartInvite.count({
        where: {
          sentByProfessionalId: professionalId,
          status: "SENT",
          sentAt: { lt: sevenDaysAgo },
          patientRecord: { linkedUserId: null },
        },
      }),
      db.patientRecord.count({
        where: {
          professionalId,
          linkedUserId: null,
          email: { not: null },
          chartInvites: { none: { status: { in: ["SENT", "LINKED"] } } },
        },
      }),
      db.patientChartInvite.count({
        where: {
          sentByProfessionalId: professionalId,
          status: "SENT",
          patientRecord: { linkedUserId: null },
        },
      }),
      db.patientRecord.count({
        where: {
          professionalId,
          linkedUserId: null,
          email: { not: null },
        },
      }),
    ]);

  return { staleInvites, chartsNeedingInvite, pendingInvites, unlinkedWithEmail };
}
