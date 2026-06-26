import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { createHumanitarianDailyRoom } from "@/lib/humanitarian/daily-room";
import { DEFAULT_VENEZUELA_POOLS } from "@/lib/humanitarian/constants";
import type { HumanitarianQueueEntry } from "@prisma/client";

const ACTIVE_ENTRY_STATUSES = ["WAITING", "CALLED", "IN_PROGRESS"] as const;

export async function expireHumanitarianNoShows(poolId: string): Promise<number> {
  const now = new Date();
  const pool = await db.humanitarianPool.findUnique({
    where: { id: poolId },
    include: { campaign: true },
  });
  if (!pool) return 0;

  const expired = await db.humanitarianQueueEntry.findMany({
    where: {
      poolId,
      status: "CALLED",
      expiresAt: { lt: now },
    },
    select: { id: true, patientUserId: true, volunteerId: true },
  });

  for (const e of expired) {
    await db.$transaction([
      db.humanitarianQueueEntry.update({
        where: { id: e.id },
        data: { status: "NO_SHOW", endedAt: now },
      }),
      ...(e.volunteerId
        ? [
            db.humanitarianVolunteer.update({
              where: { id: e.volunteerId },
              data: { status: "ONLINE", currentEntryId: null },
            }),
          ]
        : []),
    ]);

    await createNotification({
      userId: e.patientUserId,
      title: "Perdiste tu turno",
      body: "No entraste a tiempo. Si a?n necesitas atenci?n, vuelve a unirte a la fila.",
      type: "system",
      data: {
        titleKey: "hum.notif.missed.title",
        bodyKey: "hum.notif.missed.body",
      },
    }).catch(() => {});

    if (e.volunteerId) {
      const vol = await db.humanitarianVolunteer.findUnique({ where: { id: e.volunteerId } });
      if (vol?.status === "ONLINE") {
        await assignNextInPool(vol.poolId);
      }
    }
  }

  return expired.length;
}

export async function assignNextInPool(poolId: string): Promise<HumanitarianQueueEntry | null> {
  await expireHumanitarianNoShows(poolId);

  for (let attempt = 0; attempt < 3; attempt++) {
    const assigned = await tryAssignOnce(poolId);
    if (assigned) return assigned;
    break;
  }
  return null;
}

async function tryAssignOnce(poolId: string): Promise<HumanitarianQueueEntry | null> {
  const pool = await db.humanitarianPool.findUnique({
    where: { id: poolId },
    include: { campaign: true },
  });
  if (!pool || !pool.campaign.active) return null;

  const entry = await db.humanitarianQueueEntry.findFirst({
    where: { poolId, status: "WAITING" },
    orderBy: { position: "asc" },
  });
  if (!entry) return null;

  const volunteer = await db.humanitarianVolunteer.findFirst({
    where: { poolId, status: "ONLINE" },
    orderBy: [{ lastAssignedAt: "asc" }, { id: "asc" }],
  });
  if (!volunteer) return null;

  const room = await createHumanitarianDailyRoom();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + pool.campaign.noShowTimeoutSeconds * 1000,
  );

  try {
    const updated = await db.$transaction(async (tx) => {
      const vol = await tx.humanitarianVolunteer.findUnique({
        where: { id: volunteer.id },
      });
      if (!vol || vol.status !== "ONLINE") return null;

      const waiting = await tx.humanitarianQueueEntry.findFirst({
        where: { id: entry.id, status: "WAITING" },
      });
      if (!waiting) return null;

      await tx.humanitarianVolunteer.update({
        where: { id: volunteer.id },
        data: {
          status: "BUSY",
          currentEntryId: entry.id,
          lastAssignedAt: now,
        },
      });

      return tx.humanitarianQueueEntry.update({
        where: { id: entry.id },
        data: {
          status: "CALLED",
          volunteerId: volunteer.id,
          calledAt: now,
          expiresAt,
          meetingUrl: room.url || null,
          meetingRoomId: room.name || null,
        },
      });
    });

    if (!updated) return null;

    await createNotification({
      userId: updated.patientUserId,
      title: "?Es tu turno!",
      body: "Un profesional est? listo para atenderte. Tienes 3 minutos para entrar.",
      type: "message",
      data: {
        entryId: updated.id,
        meetingUrl: updated.meetingUrl,
        titleKey: "hum.notif.yourTurn.title",
        bodyKey: "hum.notif.yourTurn.body",
      },
    }).catch(() => {});

    return updated;
  } catch {
    return null;
  }
}

export async function completeHumanitarianEntry(
  entryId: string,
  volunteerUserId: string,
): Promise<void> {
  const now = new Date();
  const entry = await db.humanitarianQueueEntry.findUnique({
    where: { id: entryId },
    include: { volunteer: true, pool: true },
  });
  if (!entry?.volunteer || entry.volunteer.userId !== volunteerUserId) {
    throw new Error("Forbidden");
  }

  await db.$transaction([
    db.humanitarianQueueEntry.update({
      where: { id: entryId },
      data: { status: "DONE", endedAt: now },
    }),
    db.humanitarianVolunteer.update({
      where: { id: entry.volunteerId! },
      data: { status: "ONLINE", currentEntryId: null },
    }),
  ]);

  await assignNextInPool(entry.poolId);
}

export async function releaseVolunteer(volunteerId: string): Promise<void> {
  const vol = await db.humanitarianVolunteer.findUnique({
    where: { id: volunteerId },
    include: { pool: true },
  });
  if (!vol) return;

  const now = new Date();
  if (vol.currentEntryId) {
    await db.humanitarianQueueEntry.updateMany({
      where: {
        id: vol.currentEntryId,
        status: { in: ["CALLED", "IN_PROGRESS"] },
      },
      data: { status: "CANCELLED", endedAt: now },
    });
  }

  await db.humanitarianVolunteer.update({
    where: { id: volunteerId },
    data: { status: "OFFLINE", currentEntryId: null },
  });
}

export async function getEntryStatus(entryId: string, patientUserId: string) {
  const entry = await db.humanitarianQueueEntry.findUnique({
    where: { id: entryId },
    include: {
      pool: { include: { campaign: true } },
      volunteer: {
        include: {
          professional: { select: { firstName: true, lastName: true, specialty: true } },
          psychoanalyst: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!entry || entry.patientUserId !== patientUserId) return null;

  await expireHumanitarianNoShows(entry.poolId);

  const refreshed = await db.humanitarianQueueEntry.findUnique({
    where: { id: entryId },
    include: {
      pool: { include: { campaign: true } },
      volunteer: {
        include: {
          professional: { select: { firstName: true, lastName: true, specialty: true } },
          psychoanalyst: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!refreshed) return null;

  const aheadCount = await db.humanitarianQueueEntry.count({
    where: {
      poolId: refreshed.poolId,
      status: "WAITING",
      position: { lt: refreshed.position },
    },
  });

  const onlineVolunteers = await db.humanitarianVolunteer.count({
    where: { poolId: refreshed.poolId, status: { in: ["ONLINE", "BUSY"] } },
  });

  const estMins = refreshed.pool.campaign.estimatedMinutesPerPatient;
  const estimatedWaitMinutes =
    refreshed.status === "WAITING"
      ? Math.max(
          estMins,
          Math.ceil(aheadCount / Math.max(onlineVolunteers, 1)) * estMins,
        )
      : 0;

  let professionalName: string | null = null;
  if (refreshed.volunteer?.professional) {
    const p = refreshed.volunteer.professional;
    professionalName = `Dr. ${p.firstName} ${p.lastName}`;
  } else if (refreshed.volunteer?.psychoanalyst) {
    const p = refreshed.volunteer.psychoanalyst;
    professionalName = `${p.firstName} ${p.lastName}`;
  }

  return {
    id: refreshed.id,
    status: refreshed.status,
    position: refreshed.position,
    aheadCount,
    estimatedWaitMinutes,
    onlineVolunteers,
    calledAt: refreshed.calledAt?.toISOString() ?? null,
    expiresAt: refreshed.expiresAt?.toISOString() ?? null,
    meetingUrl: refreshed.meetingUrl ?? null,
    poolSlug: refreshed.pool.slug,
    poolLabel: refreshed.pool.labelEs,
    professionalName,
    campaignActive: refreshed.pool.campaign.active,
  };
}

export async function countActiveInPool(poolId: string): Promise<number> {
  return db.humanitarianQueueEntry.count({
    where: {
      poolId,
      status: { in: [...ACTIVE_ENTRY_STATUSES] },
    },
  });
}

export async function getCampaignStats(campaignId: string) {
  const pools = await db.humanitarianPool.findMany({
    where: { campaignId },
    orderBy: { sortOrder: "asc" },
  });

  const stats = await Promise.all(
    pools.map(async (pool) => {
      const [waiting, volunteersOnline, volunteersBusy] = await Promise.all([
        db.humanitarianQueueEntry.count({
          where: { poolId: pool.id, status: { in: ["WAITING", "CALLED"] } },
        }),
        db.humanitarianVolunteer.count({
          where: { poolId: pool.id, status: "ONLINE" },
        }),
        db.humanitarianVolunteer.count({
          where: { poolId: pool.id, status: "BUSY" },
        }),
      ]);
      return {
        ...pool,
        waiting,
        volunteersOnline,
        volunteersBusy,
        isFull: waiting >= pool.maxWaiting,
      };
    }),
  );

  return stats;
}

export type VolunteerProfile = {
  userId: string;
  providerType: "HEALTH" | "PSYCHOANALYST";
  professionalId?: string;
  psychoanalystId?: string;
  displayName: string;
  specialty?: string;
};

export async function resolveVolunteerProfile(userId: string, role: string): Promise<VolunteerProfile | null> {
  if (role === "PSYCHOANALYST") {
    const pa = await db.psychoanalystProfile.findUnique({
      where: { userId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!pa) return null;
    return {
      userId,
      providerType: "PSYCHOANALYST",
      psychoanalystId: pa.id,
      displayName: `${pa.firstName} ${pa.lastName}`,
      specialty: "Psican?lise",
    };
  }

  if (role === "PROFESSIONAL") {
    const pro = await db.professionalProfile.findUnique({
      where: { userId },
      select: { id: true, firstName: true, lastName: true, specialty: true },
    });
    if (!pro) return null;
    return {
      userId,
      providerType: "HEALTH",
      professionalId: pro.id,
      displayName: `Dr. ${pro.firstName} ${pro.lastName}`,
      specialty: pro.specialty,
    };
  }

  return null;
}

export function poolMatchesVolunteer(
  poolSlug: string,
  _profile: VolunteerProfile,
  role: string,
): boolean {
  const def = DEFAULT_VENEZUELA_POOLS.find((p) => p.slug === poolSlug);
  if (!def) return true;
  return def.volunteerRoles.includes(role as "PROFESSIONAL" | "PSYCHOANALYST");
}
