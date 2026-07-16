import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import {
  IN_PROGRESS_STALE_MS,
  presenceCutoff,
} from "@/lib/humanitarian/volunteer-presence";
import type { HumanitarianCampaignReportDto } from "@/lib/humanitarian/types";
import { buildCampaignReport } from "@/lib/humanitarian/notify";

const LONG_WAIT_MS = 30 * 60 * 1000;
const CRISIS_WAIT_ALERT_MS = 5 * 60 * 1000;
const OFFLINE_RECENT_MS = 30 * 60 * 1000;

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

function volunteerDisplayName(vol: {
  professional?: { firstName: string; lastName: string } | null;
  psychoanalyst?: { firstName: string; lastName: string } | null;
  integrativeTherapist?: { firstName: string; lastName: string } | null;
  user?: { email: string } | null;
}): string {
  if (vol.professional) {
    return `Dr. ${vol.professional.firstName} ${vol.professional.lastName}`.trim();
  }
  if (vol.psychoanalyst) {
    return `${vol.psychoanalyst.firstName} ${vol.psychoanalyst.lastName}`.trim();
  }
  if (vol.integrativeTherapist) {
    return `${vol.integrativeTherapist.firstName} ${vol.integrativeTherapist.lastName}`.trim();
  }
  return vol.user?.email?.split("@")[0] || "Voluntário";
}

function patientDisplayName(profile: {
  firstName: string;
  lastName: string;
} | null | undefined, email?: string | null): string {
  if (profile) {
    const name = `${safeDecrypt(profile.firstName)} ${safeDecrypt(profile.lastName)}`.trim();
    if (name) return name;
  }
  return email?.split("@")[0] || "Paciente";
}

export type LiveAlertSeverity = "warning" | "critical";

export interface LiveAlertDto {
  id: string;
  type:
    | "long_wait"
    | "crisis_uncovered"
    | "stale_consult"
    | "queue_no_volunteers"
    | "called_pending";
  severity: LiveAlertSeverity;
  message: string;
  poolSlug?: string;
  entryId?: string;
  patientProfileId?: string;
  volunteerId?: string;
}

export interface LiveQueueRowDto {
  entryId: string;
  status: "WAITING" | "CALLED";
  priority: "ROUTINE" | "URGENT" | "CRISIS";
  position: number;
  poolId: string;
  poolSlug: string;
  poolLabel: string;
  patientUserId: string;
  patientProfileId: string | null;
  patientName: string;
  enteredAt: string;
  waitMinutes: number;
  calledAt: string | null;
  chiefComplaint: string | null;
}

export interface LiveConsultRowDto {
  entryId: string;
  poolSlug: string;
  poolLabel: string;
  patientUserId: string;
  patientProfileId: string | null;
  patientName: string;
  volunteerId: string | null;
  volunteerName: string | null;
  startedAt: string;
  durationMinutes: number;
  channel: string | null;
  meetingUrl: string | null;
  stale: boolean;
  adminProblemAt: string | null;
}

export interface LiveVolunteerRowDto {
  volunteerId: string;
  userId: string;
  status: "ONLINE" | "BUSY" | "OFFLINE";
  present: boolean;
  poolId: string;
  poolSlug: string;
  poolLabel: string;
  name: string;
  lastSeenAt: string | null;
  currentEntryId: string | null;
  currentPatientName: string | null;
  currentPatientProfileId: string | null;
}

export interface HumanitarianLiveOpsDto {
  campaignId: string;
  slug: string;
  name: string;
  active: boolean;
  report: HumanitarianCampaignReportDto;
  totals: {
    waiting: number;
    called: number;
    inConsult: number;
    free: number;
    busy: number;
    completedToday: number;
    noShowsToday: number;
    avgWaitMinutesToday: number | null;
    oldestWaitMinutes: number | null;
  };
  queue: LiveQueueRowDto[];
  consults: LiveConsultRowDto[];
  volunteers: LiveVolunteerRowDto[];
  alerts: LiveAlertDto[];
  fetchedAt: string;
}

export async function buildCampaignLiveOps(
  campaignId: string,
): Promise<HumanitarianLiveOpsDto | null> {
  const campaign = await db.humanitarianCampaign.findUnique({
    where: { id: campaignId },
    include: { pools: { orderBy: { sortOrder: "asc" } } },
  });
  if (!campaign) return null;

  const report = await buildCampaignReport(campaignId);
  if (!report) return null;

  const now = Date.now();
  const cutoff = presenceCutoff();
  const offlineSince = new Date(now - OFFLINE_RECENT_MS);
  const staleCutoff = new Date(now - IN_PROGRESS_STALE_MS);

  const [queueEntries, consultEntries, volunteers, calledCount] = await Promise.all([
    db.humanitarianQueueEntry.findMany({
      where: { campaignId, status: { in: ["WAITING", "CALLED"] } },
      include: {
        pool: { select: { id: true, slug: true, labelEs: true, labelPt: true } },
        patientUser: {
          select: {
            id: true,
            email: true,
            patientProfile: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: [{ priority: "desc" }, { position: "asc" }, { enteredAt: "asc" }],
    }),
    db.humanitarianQueueEntry.findMany({
      where: { campaignId, status: "IN_PROGRESS" },
      include: {
        pool: { select: { slug: true, labelEs: true, labelPt: true } },
        patientUser: {
          select: {
            id: true,
            email: true,
            patientProfile: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        volunteer: {
          include: {
            professional: { select: { firstName: true, lastName: true } },
            psychoanalyst: { select: { firstName: true, lastName: true } },
            integrativeTherapist: { select: { firstName: true, lastName: true } },
            user: { select: { email: true } },
          },
        },
      },
      orderBy: { startedAt: "asc" },
    }),
    db.humanitarianVolunteer.findMany({
      where: {
        campaignId,
        OR: [
          { status: { in: ["ONLINE", "BUSY"] } },
          { status: "OFFLINE", lastSeenAt: { gte: offlineSince } },
        ],
      },
      include: {
        pool: { select: { id: true, slug: true, labelEs: true, labelPt: true } },
        professional: { select: { firstName: true, lastName: true } },
        psychoanalyst: { select: { firstName: true, lastName: true } },
        integrativeTherapist: { select: { firstName: true, lastName: true } },
        user: { select: { email: true } },
        entries: {
          where: { status: { in: ["CALLED", "IN_PROGRESS"] } },
          take: 1,
          include: {
            patientUser: {
              select: {
                email: true,
                patientProfile: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
      orderBy: [{ status: "asc" }, { lastSeenAt: "desc" }],
    }),
    db.humanitarianQueueEntry.count({
      where: { campaignId, status: "CALLED" },
    }),
  ]);

  const queue: LiveQueueRowDto[] = queueEntries.map((e) => {
    const waitMinutes = Math.max(0, Math.round((now - e.enteredAt.getTime()) / 60000));
    return {
      entryId: e.id,
      status: e.status as "WAITING" | "CALLED",
      priority: e.priority,
      position: e.position,
      poolId: e.poolId,
      poolSlug: e.pool.slug,
      poolLabel: e.pool.labelPt || e.pool.labelEs,
      patientUserId: e.patientUserId,
      patientProfileId: e.patientUser.patientProfile?.id ?? null,
      patientName: patientDisplayName(e.patientUser.patientProfile, e.patientUser.email),
      enteredAt: e.enteredAt.toISOString(),
      waitMinutes,
      calledAt: e.calledAt?.toISOString() ?? null,
      chiefComplaint: e.chiefComplaint,
    };
  });

  const consults: LiveConsultRowDto[] = consultEntries.map((e) => {
    const started = e.startedAt ?? e.enteredAt;
    const durationMinutes = Math.max(0, Math.round((now - started.getTime()) / 60000));
    const lastBeat = e.lastSeenAt ?? e.startedAt;
    const stale =
      !lastBeat || lastBeat.getTime() < staleCutoff.getTime();
    return {
      entryId: e.id,
      poolSlug: e.pool.slug,
      poolLabel: e.pool.labelPt || e.pool.labelEs,
      patientUserId: e.patientUserId,
      patientProfileId: e.patientUser.patientProfile?.id ?? null,
      patientName: patientDisplayName(e.patientUser.patientProfile, e.patientUser.email),
      volunteerId: e.volunteerId,
      volunteerName: e.volunteer ? volunteerDisplayName(e.volunteer) : null,
      startedAt: started.toISOString(),
      durationMinutes,
      channel: e.completionChannel,
      meetingUrl: e.meetingUrl,
      stale,
      adminProblemAt: e.adminProblemAt?.toISOString() ?? null,
    };
  });

  const volunteersDto: LiveVolunteerRowDto[] = volunteers.map((v) => {
    const heartbeatOk = !!v.lastSeenAt && v.lastSeenAt >= cutoff;
    let status: "ONLINE" | "BUSY" | "OFFLINE" = v.status;
    if (v.status === "ONLINE" && !heartbeatOk) status = "OFFLINE";
    const present = status === "ONLINE" || status === "BUSY";
    const current = v.entries[0];
    return {
      volunteerId: v.id,
      userId: v.userId,
      status,
      present,
      poolId: v.poolId,
      poolSlug: v.pool.slug,
      poolLabel: v.pool.labelPt || v.pool.labelEs,
      name: volunteerDisplayName(v),
      lastSeenAt: v.lastSeenAt?.toISOString() ?? null,
      currentEntryId: v.currentEntryId,
      currentPatientName: current
        ? patientDisplayName(
            current.patientUser.patientProfile,
            current.patientUser.email,
          )
        : null,
      currentPatientProfileId: current?.patientUser.patientProfile?.id ?? null,
    };
  });

  // Prefer true presence for free count
  const free = volunteersDto.filter((v) => v.status === "ONLINE" && v.present).length;
  const busy = volunteersDto.filter((v) => v.status === "BUSY").length;

  const alerts: LiveAlertDto[] = [];

  for (const row of queue) {
    if (row.priority === "CRISIS" && row.waitMinutes * 60000 >= CRISIS_WAIT_ALERT_MS) {
      const poolFree = volunteersDto.filter(
        (v) => v.poolSlug === row.poolSlug && v.status === "ONLINE" && v.present,
      ).length;
      if (poolFree === 0) {
        alerts.push({
          id: `crisis-uncovered-${row.entryId}`,
          type: "crisis_uncovered",
          severity: "critical",
          message: `Crise sem voluntário livre em ${row.poolLabel}: ${row.patientName} (${row.waitMinutes} min)`,
          poolSlug: row.poolSlug,
          entryId: row.entryId,
          patientProfileId: row.patientProfileId ?? undefined,
        });
      }
    }
    if (row.waitMinutes * 60000 >= LONG_WAIT_MS) {
      alerts.push({
        id: `long-wait-${row.entryId}`,
        type: "long_wait",
        severity: row.priority === "CRISIS" ? "critical" : "warning",
        message: `Espera longa (${row.waitMinutes} min): ${row.patientName} — ${row.poolLabel}`,
        poolSlug: row.poolSlug,
        entryId: row.entryId,
        patientProfileId: row.patientProfileId ?? undefined,
      });
    }
    if (row.status === "CALLED") {
      alerts.push({
        id: `called-${row.entryId}`,
        type: "called_pending",
        severity: "warning",
        message: `Chamado, aguardando entrada: ${row.patientName} — ${row.poolLabel}`,
        poolSlug: row.poolSlug,
        entryId: row.entryId,
        patientProfileId: row.patientProfileId ?? undefined,
      });
    }
  }

  for (const c of consults) {
    if (c.stale) {
      alerts.push({
        id: `stale-${c.entryId}`,
        type: "stale_consult",
        severity: "critical",
        message: `Consulta sem heartbeat (~${c.durationMinutes} min): ${c.patientName}${c.volunteerName ? ` ↔ ${c.volunteerName}` : ""}`,
        poolSlug: c.poolSlug,
        entryId: c.entryId,
        patientProfileId: c.patientProfileId ?? undefined,
        volunteerId: c.volunteerId ?? undefined,
      });
    }
  }

  for (const pool of campaign.pools) {
    const waitingInPool = queue.filter((q) => q.poolId === pool.id).length;
    const freeInPool = volunteersDto.filter(
      (v) => v.poolId === pool.id && v.status === "ONLINE" && v.present,
    ).length;
    if (waitingInPool > 0 && freeInPool === 0) {
      alerts.push({
        id: `no-vol-${pool.id}`,
        type: "queue_no_volunteers",
        severity: "warning",
        message: `${waitingInPool} na fila de ${pool.labelPt || pool.labelEs} sem voluntários livres`,
        poolSlug: pool.slug,
      });
    }
  }

  // Deduplicate by id priority (critical first already pushed)
  const seen = new Set<string>();
  const uniqueAlerts = alerts.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  uniqueAlerts.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1;
    return 0;
  });

  const oldestWaitMinutes =
    queue.length > 0 ? Math.max(...queue.map((q) => q.waitMinutes)) : null;

  // Align report volunteer counts with TTL
  report.totals.volunteersOnline = free;
  report.totals.volunteersBusy = busy;
  for (const p of report.pools) {
    p.volunteersOnline = volunteersDto.filter(
      (v) => v.poolSlug === p.slug && v.status === "ONLINE" && v.present,
    ).length;
    p.volunteersBusy = volunteersDto.filter(
      (v) => v.poolSlug === p.slug && v.status === "BUSY",
    ).length;
  }

  return {
    campaignId: campaign.id,
    slug: campaign.slug,
    name: campaign.name,
    active: campaign.active,
    report,
    totals: {
      waiting: queue.filter((q) => q.status === "WAITING").length,
      called: calledCount,
      inConsult: consults.length,
      free,
      busy,
      completedToday: report.totals.completedToday,
      noShowsToday: report.totals.noShowsToday,
      avgWaitMinutesToday: report.totals.avgWaitMinutesToday,
      oldestWaitMinutes,
    },
    queue,
    consults,
    volunteers: volunteersDto,
    alerts: uniqueAlerts,
    fetchedAt: new Date().toISOString(),
  };
}
