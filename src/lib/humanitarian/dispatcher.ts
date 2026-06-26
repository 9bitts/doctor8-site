import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { ensurePatientRecord } from "@/lib/ensure-patient-record";
import { createHumanitarianDailyRoom } from "@/lib/humanitarian/daily-room";
import { DEFAULT_VENEZUELA_POOLS } from "@/lib/humanitarian/constants";
import {
  notifyHumanitarianMissedTurn,
  notifyHumanitarianYourTurn,
  notifyVolunteerAssigned,
} from "@/lib/humanitarian/notify";
import { WAITING_ENTRY_STATUSES } from "@/lib/humanitarian/types";
import type { HumanitarianPriority, HumanitarianQueueEntry } from "@prisma/client";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

const PRIORITY_SORT: HumanitarianPriority[] = ["CRISIS", "URGENT", "ROUTINE"];

export async function expireHumanitarianNoShows(poolId: string): Promise<number> {
  const pool = await db.humanitarianPool.findUnique({
    where: { id: poolId },
    include: { campaign: true },
  });
  if (!pool) return 0;

  const now = new Date();
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

    await notifyHumanitarianMissedTurn(e.patientUserId, pool.campaign.slug);

    if (e.volunteerId) {
      await assignNextInPool(poolId);
    }
  }

  return expired.length;
}

export async function assignNextInPool(poolId: string): Promise<HumanitarianQueueEntry | null> {
  await expireHumanitarianNoShows(poolId);
  return tryAssignOnce(poolId);
}

async function findNextWaitingEntry(poolId: string) {
  for (const priority of PRIORITY_SORT) {
    const entry = await db.humanitarianQueueEntry.findFirst({
      where: { poolId, status: "WAITING", priority },
      orderBy: { position: "asc" },
    });
    if (entry) return entry;
  }
  return null;
}

async function tryAssignOnce(poolId: string): Promise<HumanitarianQueueEntry | null> {
  const pool = await db.humanitarianPool.findUnique({
    where: { id: poolId },
    include: { campaign: true },
  });
  if (!pool || !pool.campaign.active) return null;

  const entry = await findNextWaitingEntry(poolId);
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

    const full = await db.humanitarianQueueEntry.findUnique({
      where: { id: updated.id },
      include: {
        volunteer: {
          include: {
            professional: { select: { firstName: true, lastName: true } },
            psychoanalyst: { select: { firstName: true, lastName: true } },
          },
        },
        pool: { include: { campaign: { select: { slug: true } } } },
      },
    });
    if (!full) return updated;

    let professionalName: string | null = null;
    if (full.volunteer?.professional) {
      const p = full.volunteer.professional;
      professionalName = `Dr. ${p.firstName} ${p.lastName}`;
    } else if (full.volunteer?.psychoanalyst) {
      const p = full.volunteer.psychoanalyst;
      professionalName = `${p.firstName} ${p.lastName}`;
    }

    const patientProfile = await db.patientProfile.findUnique({
      where: { userId: full.patientUserId },
      select: { firstName: true, lastName: true },
    });
    const patientName = patientProfile
      ? `${safeDecrypt(patientProfile.firstName)} ${safeDecrypt(patientProfile.lastName)}`.trim()
      : "Paciente";

    await notifyHumanitarianYourTurn({
      patientUserId: full.patientUserId,
      entryId: full.id,
      campaignSlug: full.pool.campaign.slug,
      professionalName,
    });

    await notifyVolunteerAssigned({
      volunteerUserId: volunteer.userId,
      entryId: full.id,
      patientName,
      chiefComplaint: full.chiefComplaint,
    });

    return full;
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
    include: {
      volunteer: {
        include: {
          professional: { select: { id: true } },
        },
      },
      pool: true,
    },
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

  if (entry.volunteer.professionalId) {
    await ensurePatientRecord(entry.volunteer.professionalId, entry.patientUserId).catch(
      () => {},
    );
  }

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
    await assignNextInPool(vol.poolId);
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

  const higherPriority = PRIORITY_SORT.filter(
    (p) => PRIORITY_SORT.indexOf(p) < PRIORITY_SORT.indexOf(refreshed.priority),
  );

  const aheadCount = await db.humanitarianQueueEntry.count({
    where: {
      poolId: refreshed.poolId,
      status: "WAITING",
      OR: [
        ...higherPriority.map((priority) => ({ priority })),
        { priority: refreshed.priority, position: { lt: refreshed.position } },
      ],
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
          Math.ceil((aheadCount + 1) / Math.max(onlineVolunteers, 1)) * estMins,
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
    priority: refreshed.priority,
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
    campaignSlug: refreshed.pool.campaign.slug,
  };
}

export async function countActiveInPool(poolId: string): Promise<number> {
  return db.humanitarianQueueEntry.count({
    where: {
      poolId,
      status: { in: [...WAITING_ENTRY_STATUSES] },
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
