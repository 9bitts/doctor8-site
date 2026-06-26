import { db } from "@/lib/db";
import type { VolunteerBannerState } from "@/components/humanitarian/HumanitarianVolunteerBanner";

export async function getVolunteerDashboardState(
  userId: string,
): Promise<VolunteerBannerState | null> {
  const volunteer = await db.humanitarianVolunteer.findFirst({
    where: {
      userId,
      status: { in: ["ONLINE", "BUSY"] },
      campaign: { active: true },
    },
    include: {
      pool: { select: { labelEs: true, labelPt: true, labelEn: true } },
    },
    orderBy: { lastAssignedAt: "desc" },
  });

  if (!volunteer) return null;

  const pool = volunteer.pool;

  if (volunteer.status === "BUSY") {
    const entry = await db.humanitarianQueueEntry.findFirst({
      where: {
        volunteerId: volunteer.id,
        status: { in: ["CALLED", "IN_PROGRESS"] },
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });

    return {
      status: "BUSY",
      pool,
      entryId: entry?.id ?? volunteer.currentEntryId,
    };
  }

  return {
    status: "ONLINE",
    pool,
  };
}
