import { db } from "@/lib/db";

export interface HistoryDayBucket {
  date: string;
  completed: number;
  noShow: number;
  cancelled: number;
  entered: number;
}

export interface HistoryHourBucket {
  hour: number;
  completed: number;
  entered: number;
}

export interface HumanitarianHistoryDto {
  campaignId: string;
  slug: string;
  from: string;
  to: string;
  days: HistoryDayBucket[];
  hoursToday: HistoryHourBucket[];
  totals: {
    completed: number;
    noShow: number;
    cancelled: number;
    entered: number;
  };
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function buildHumanitarianHistory(
  campaignId: string,
  from: Date,
  to: Date,
): Promise<HumanitarianHistoryDto | null> {
  const campaign = await db.humanitarianCampaign.findUnique({
    where: { id: campaignId },
    select: { id: true, slug: true },
  });
  if (!campaign) return null;

  const fromDay = startOfDay(from);
  const toDay = new Date(startOfDay(to));
  toDay.setHours(23, 59, 59, 999);

  const entries = await db.humanitarianQueueEntry.findMany({
    where: {
      campaignId,
      OR: [
        { enteredAt: { gte: fromDay, lte: toDay } },
        { endedAt: { gte: fromDay, lte: toDay } },
      ],
    },
    select: {
      status: true,
      enteredAt: true,
      endedAt: true,
    },
  });

  const dayMap = new Map<string, HistoryDayBucket>();
  for (let t = fromDay.getTime(); t <= toDay.getTime(); t += 86400000) {
    const key = dateKey(new Date(t));
    dayMap.set(key, { date: key, completed: 0, noShow: 0, cancelled: 0, entered: 0 });
  }

  const hoursToday: HistoryHourBucket[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    completed: 0,
    entered: 0,
  }));
  const todayKey = dateKey(new Date());

  for (const e of entries) {
    const enteredKey = dateKey(e.enteredAt);
    const day = dayMap.get(enteredKey);
    if (day) day.entered += 1;

    if (enteredKey === todayKey) {
      hoursToday[e.enteredAt.getHours()].entered += 1;
    }

    if (e.endedAt) {
      const endedKey = dateKey(e.endedAt);
      const endDay = dayMap.get(endedKey);
      if (endDay) {
        if (e.status === "DONE") endDay.completed += 1;
        else if (e.status === "NO_SHOW") endDay.noShow += 1;
        else if (e.status === "CANCELLED") endDay.cancelled += 1;
      }
      if (endedKey === todayKey && e.status === "DONE") {
        hoursToday[e.endedAt.getHours()].completed += 1;
      }
    }
  }

  const days = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  const totals = days.reduce(
    (acc, d) => ({
      completed: acc.completed + d.completed,
      noShow: acc.noShow + d.noShow,
      cancelled: acc.cancelled + d.cancelled,
      entered: acc.entered + d.entered,
    }),
    { completed: 0, noShow: 0, cancelled: 0, entered: 0 },
  );

  return {
    campaignId: campaign.id,
    slug: campaign.slug,
    from: fromDay.toISOString(),
    to: toDay.toISOString(),
    days,
    hoursToday,
    totals,
  };
}

export interface HumanitarianAuditRowDto {
  id: string;
  createdAt: string;
  action: string;
  resource: string;
  resourceId: string | null;
  adminAction: string | null;
  details: Record<string, unknown> | null;
  userEmail: string | null;
}

export async function listHumanitarianAuditLogs(limit = 50): Promise<HumanitarianAuditRowDto[]> {
  const logs = await db.auditLog.findMany({
    where: {
      resource: {
        in: ["HumanitarianQueueEntry", "HumanitarianVolunteer", "Appointment"],
      },
    },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit * 3, 400),
  });

  const filtered = logs.filter((l) => {
    const details = l.details as Record<string, unknown> | null;
    if (!details) return l.resource.startsWith("Humanitarian");
    if (typeof details.adminAction === "string") return true;
    return l.resource === "HumanitarianQueueEntry" || l.resource === "HumanitarianVolunteer";
  });

  return filtered.slice(0, limit).map((l) => {
    const details = (l.details as Record<string, unknown> | null) ?? null;
    const adminAction =
      details && typeof details.adminAction === "string" ? details.adminAction : null;
    return {
      id: l.id,
      createdAt: l.createdAt.toISOString(),
      action: l.action,
      resource: l.resource,
      resourceId: l.resourceId,
      adminAction,
      details,
      userEmail: l.user?.email ?? null,
    };
  });
}
