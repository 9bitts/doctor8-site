import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { ensurePatientRecord } from "@/lib/ensure-patient-record";
import { ensureAnalysandForPatient, ensureIntegrativeClientForPatient } from "@/lib/providers";
import { createHumanitarianDailyRoom } from "@/lib/humanitarian/daily-room";
import { createHumanitarianMeetLink } from "@/lib/google-meet";
import { logDailyRecording } from "@/lib/daily-recording-log";
import { DEFAULT_VENEZUELA_POOLS, poolLabel } from "@/lib/humanitarian/constants";
import { resolveProfessionalPoolSlug } from "@/lib/humanitarian/pool-slugs";
import {
  notifyHumanitarianMissedTurn,
  notifyHumanitarianYourTurn,
  notifyVolunteerAssigned,
} from "@/lib/humanitarian/notify";
import { WAITING_ENTRY_STATUSES } from "@/lib/humanitarian/types";
import { presenceCutoff } from "@/lib/humanitarian/volunteer-presence";
import {
  buildVolunteerWhatsAppMessage,
  resolvePatientHumanitarianPhone,
} from "@/lib/humanitarian/phone";
import { buildClinicalDocumentWaMeUrl } from "@/lib/whatsapp";
import type { HumanitarianPriority, HumanitarianQueueEntry } from "@prisma/client";
import { Prisma } from "@prisma/client";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

const PRIORITY_SORT: HumanitarianPriority[] = ["CRISIS", "URGENT", "ROUTINE"];

export async function expireHumanitarianNoShows(poolId: string): Promise<number> {
  const now = new Date();
  const expired = await db.humanitarianQueueEntry.findMany({
    where: {
      poolId,
      status: "CALLED",
      expiresAt: { lt: now },
    },
    select: { id: true, patientUserId: true, volunteerId: true, poolId: true },
  });

  return processExpiredCalledEntries(expired, now);
}

/** Expire all overdue CALLED entries across every pool (clears queue zombies). */
export async function expireAllHumanitarianNoShows(): Promise<number> {
  const now = new Date();
  const expired = await db.humanitarianQueueEntry.findMany({
    where: {
      status: "CALLED",
      expiresAt: { lt: now },
    },
    select: { id: true, patientUserId: true, volunteerId: true, poolId: true },
  });

  return processExpiredCalledEntries(expired, now);
}

async function processExpiredCalledEntries(
  expired: { id: string; patientUserId: string; volunteerId: string | null; poolId: string }[],
  now: Date,
): Promise<number> {
  const poolsToReassign = new Set<string>();

  for (const e of expired) {
    const pool = await db.humanitarianPool.findUnique({
      where: { id: e.poolId },
      include: { campaign: true },
    });
    if (!pool) continue;

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
      poolsToReassign.add(e.poolId);
    }
  }

  for (const poolId of poolsToReassign) {
    await assignNextInPool(poolId);
  }

  return expired.length;
}

/** Mark ONLINE volunteers without a recent heartbeat as OFFLINE. */
export async function expireStaleVolunteers(): Promise<number> {
  const cutoff = presenceCutoff();
  const stale = await db.humanitarianVolunteer.findMany({
    where: {
      status: "ONLINE",
      OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: cutoff } }],
    },
    select: { id: true },
  });

  if (stale.length === 0) return 0;

  await db.humanitarianVolunteer.updateMany({
    where: { id: { in: stale.map((v) => v.id) } },
    data: { status: "OFFLINE", currentEntryId: null },
  });

  return stale.length;
}

/** Free volunteers stuck BUSY with finished or expired entries. */
export async function reconcileStuckBusyVolunteers(): Promise<number> {
  const now = new Date();
  const busy = await db.humanitarianVolunteer.findMany({
    where: { status: "BUSY", currentEntryId: { not: null } },
    select: { id: true, currentEntryId: true },
  });

  let fixed = 0;
  for (const vol of busy) {
    if (!vol.currentEntryId) continue;
    const entry = await db.humanitarianQueueEntry.findUnique({
      where: { id: vol.currentEntryId },
      select: { status: true, expiresAt: true },
    });

    const stillActive =
      entry &&
      (entry.status === "IN_PROGRESS" ||
        (entry.status === "CALLED" && entry.expiresAt && entry.expiresAt >= now));

    if (stillActive) continue;

    await db.humanitarianVolunteer.update({
      where: { id: vol.id },
      data: { status: "OFFLINE", currentEntryId: null },
    });
    fixed++;
  }

  return fixed;
}

export async function assignNextInPool(poolId: string): Promise<number> {
  await expireAllHumanitarianNoShows();
  await expireStaleVolunteers();
  await reconcileStuckBusyVolunteers();
  let assigned = 0;
  while (await tryAssignOnce(poolId)) assigned++;
  return assigned;
}

export async function promoteHumanitarianEntryToInProgress(entryId: string): Promise<void> {
  const now = new Date();
  await db.humanitarianQueueEntry.updateMany({
    where: { id: entryId, status: "CALLED" },
    data: { status: "IN_PROGRESS", startedAt: now },
  });
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
    where: {
      poolId,
      status: "ONLINE",
      lastSeenAt: { gte: presenceCutoff() },
    },
    orderBy: [{ lastAssignedAt: "asc" }, { id: "asc" }],
  });
  if (!volunteer) return null;

  const room = await createHumanitarianDailyRoom();
  if (!room.url || !room.name) {
    console.error("[humanitarian] Daily room creation failed", { poolId });
    return null;
  }

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
        where: { id: entry.id, status: "WAITING" },
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

    if (room.name) {
      await logDailyRecording({
        dailyRoomName: room.name,
        humanitarianEntryId: updated.id,
      });
    }

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
        intake: { select: { triageFlags: true, computedPriority: true } },
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
      noShowTimeoutSeconds: pool.campaign.noShowTimeoutSeconds,
    });

    await notifyVolunteerAssigned({
      volunteerUserId: volunteer.userId,
      entryId: full.id,
      patientName,
      chiefComplaint: full.chiefComplaint,
      triageFlags: full.intake?.triageFlags,
      priority: full.intake?.computedPriority ?? null,
    });

    return full;
  } catch (e) {
    console.error("[humanitarian] assign failed", { poolId, entryId: entry.id, error: e });
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
          psychoanalyst: { select: { id: true } },
        },
      },
      pool: { include: { campaign: { select: { slug: true } } } },
      intake: {
        select: { status: true, triageFlags: true, computedPriority: true },
      },
    },
  });
  if (!entry?.volunteer || entry.volunteer.userId !== volunteerUserId) {
    throw new Error("Forbidden");
  }

  await db.$transaction(async (tx) => {
    const done = await tx.humanitarianQueueEntry.updateMany({
      where: {
        id: entryId,
        status: { in: ["CALLED", "IN_PROGRESS"] },
        volunteer: { userId: volunteerUserId },
      },
      data: { status: "DONE", endedAt: now, completionChannel: "VIDEO" },
    });
    if (done.count === 0) throw new Error("Forbidden");

    await tx.humanitarianVolunteer.update({
      where: { id: entry.volunteerId! },
      data: { status: "ONLINE", currentEntryId: null },
    });
  });

  if (entry.volunteer.professionalId) {
    await ensurePatientRecord(entry.volunteer.professionalId, entry.patientUserId).catch(
      () => {},
    );
  } else if (entry.volunteer.psychoanalystId) {
    const patientProfile = await db.patientProfile.findUnique({
      where: { userId: entry.patientUserId },
      select: { firstName: true, lastName: true, user: { select: { email: true } } },
    });
    if (patientProfile) {
      await ensureAnalysandForPatient({
        psychoanalystId: entry.volunteer.psychoanalystId,
        patientUserId: entry.patientUserId,
        patientProfile: {
          firstName: safeDecrypt(patientProfile.firstName),
          lastName: safeDecrypt(patientProfile.lastName),
        },
        patientEmail: patientProfile.user.email,
      }).catch(() => {});
    }
  } else if (entry.volunteer.integrativeTherapistId) {
    const patientProfile = await db.patientProfile.findUnique({
      where: { userId: entry.patientUserId },
      select: { firstName: true, lastName: true, user: { select: { email: true } } },
    });
    if (patientProfile) {
      await ensureIntegrativeClientForPatient({
        integrativeTherapistId: entry.volunteer.integrativeTherapistId,
        patientUserId: entry.patientUserId,
        patientProfile: {
          firstName: safeDecrypt(patientProfile.firstName),
          lastName: safeDecrypt(patientProfile.lastName),
        },
        patientEmail: patientProfile.user.email,
      }).catch(() => {});
    }
  }

  if (entry.intake?.status !== "COMPLETE") {
    const { notifyHumanitarianAnamneseReminder } = await import("@/lib/humanitarian/notify");
    await notifyHumanitarianAnamneseReminder({
      patientUserId: entry.patientUserId,
      campaignSlug: entry.pool.campaign.slug,
    });
  }

  await assignNextInPool(entry.poolId);
}

export async function handoffHumanitarianEntryViaWhatsApp(
  entryId: string,
  volunteerUserId: string,
  lang: "pt" | "en" | "es" = "es",
): Promise<{ whatsappUrl: string; patientName: string }> {
  const now = new Date();
  const entry = await db.humanitarianQueueEntry.findUnique({
    where: { id: entryId },
    include: {
      volunteer: {
        include: {
          professional: { select: { id: true, firstName: true, lastName: true } },
          psychoanalyst: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      pool: { include: { campaign: { select: { slug: true } } } },
      intake: {
        select: { status: true, triageFlags: true, computedPriority: true },
      },
    },
  });

  if (!entry?.volunteer || entry.volunteer.userId !== volunteerUserId) {
    throw new Error("Forbidden");
  }
  if (!["CALLED", "IN_PROGRESS"].includes(entry.status)) {
    throw new Error("NOT_ACTIVE");
  }

  const phone = await resolvePatientHumanitarianPhone(entry.patientUserId);
  if (!phone) throw new Error("NO_PHONE");

  const patientProfile = await db.patientProfile.findUnique({
    where: { userId: entry.patientUserId },
    select: { firstName: true, lastName: true },
  });
  const patientName = patientProfile
    ? `${safeDecrypt(patientProfile.firstName)} ${safeDecrypt(patientProfile.lastName)}`.trim()
    : "Paciente";

  let volunteerName = "Voluntário Doctor8";
  if (entry.volunteer.professional) {
    const p = entry.volunteer.professional;
    volunteerName = `Dr. ${p.firstName} ${p.lastName}`;
  } else if (entry.volunteer.psychoanalyst) {
    const p = entry.volunteer.psychoanalyst;
    volunteerName = `${p.firstName} ${p.lastName}`;
  }

  await db.$transaction(async (tx) => {
    const done = await tx.humanitarianQueueEntry.updateMany({
      where: {
        id: entryId,
        status: { in: ["CALLED", "IN_PROGRESS"] },
        volunteer: { userId: volunteerUserId },
      },
      data: { status: "DONE", endedAt: now, completionChannel: "WHATSAPP" },
    });
    if (done.count === 0) throw new Error("Forbidden");

    await tx.humanitarianVolunteer.update({
      where: { id: entry.volunteerId! },
      data: { status: "ONLINE", currentEntryId: null },
    });
  });

  if (entry.volunteer.professionalId) {
    await ensurePatientRecord(entry.volunteer.professionalId, entry.patientUserId).catch(() => {});
  }

  const message = buildVolunteerWhatsAppMessage(volunteerName, lang);
  const whatsappUrl = buildClinicalDocumentWaMeUrl(phone, message);
  if (!whatsappUrl) throw new Error("INVALID_PHONE");

  const { notifyHumanitarianWhatsAppHandoff } = await import("@/lib/humanitarian/notify");
  await notifyHumanitarianWhatsAppHandoff({
    patientUserId: entry.patientUserId,
    campaignSlug: entry.pool.campaign.slug,
    volunteerName,
  });

  await assignNextInPool(entry.poolId);

  return { whatsappUrl, patientName };
}

export async function handoffHumanitarianEntryViaGoogleMeet(
  entryId: string,
  volunteerUserId: string,
): Promise<{ meetUrl: string; patientName: string }> {
  const now = new Date();

  const entry = await db.humanitarianQueueEntry.findUnique({
    where: { id: entryId },
    include: {
      volunteer: {
        include: {
          professional: { select: { id: true, firstName: true, lastName: true } },
          psychoanalyst: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      pool: { include: { campaign: { select: { slug: true } } } },
    },
  });

  if (!entry?.volunteer || entry.volunteer.userId !== volunteerUserId) {
    throw new Error("Forbidden");
  }
  if (!["CALLED", "IN_PROGRESS"].includes(entry.status)) {
    throw new Error("NOT_ACTIVE");
  }

  const patientProfile = await db.patientProfile.findUnique({
    where: { userId: entry.patientUserId },
    select: { firstName: true, lastName: true },
  });
  const patientName = patientProfile
    ? `${safeDecrypt(patientProfile.firstName)} ${safeDecrypt(patientProfile.lastName)}`.trim()
    : "Paciente";

  let volunteerName = "Voluntário Doctor8";
  if (entry.volunteer.professional) {
    const p = entry.volunteer.professional;
    volunteerName = `Dr. ${p.firstName} ${p.lastName}`;
  } else if (entry.volunteer.psychoanalyst) {
    const p = entry.volunteer.psychoanalyst;
    volunteerName = `${p.firstName} ${p.lastName}`;
  }

  const [volunteerUser, patientUser] = await Promise.all([
    db.user.findUnique({ where: { id: volunteerUserId }, select: { email: true } }),
    db.user.findUnique({ where: { id: entry.patientUserId }, select: { email: true } }),
  ]);

  const meetUrl = await createHumanitarianMeetLink({
    entryId,
    patientName,
    volunteerName,
    hostEmail: volunteerUser?.email ?? null,
    attendeeEmails: [volunteerUser?.email, patientUser?.email].filter(Boolean) as string[],
  });

  await db.$transaction(async (tx) => {
    const done = await tx.humanitarianQueueEntry.updateMany({
      where: {
        id: entryId,
        status: { in: ["CALLED", "IN_PROGRESS"] },
        volunteer: { userId: volunteerUserId },
      },
      data: {
        status: "DONE",
        endedAt: now,
        completionChannel: "GOOGLE_MEET",
        meetingUrl: meetUrl,
      },
    });
    if (done.count === 0) throw new Error("Forbidden");

    await tx.humanitarianVolunteer.update({
      where: { id: entry.volunteerId! },
      data: { status: "ONLINE", currentEntryId: null },
    });
  });

  if (entry.volunteer.professionalId) {
    await ensurePatientRecord(entry.volunteer.professionalId, entry.patientUserId).catch(() => {});
  }

  const { notifyHumanitarianMeetHandoff } = await import("@/lib/humanitarian/notify");
  await notifyHumanitarianMeetHandoff({
    patientUserId: entry.patientUserId,
    campaignSlug: entry.pool.campaign.slug,
    volunteerName,
    meetUrl,
  });

  await assignNextInPool(entry.poolId);

  return { meetUrl, patientName };
}

/** Patient leaves the video room — frees volunteer and advances the queue. */
export async function patientEndHumanitarianConsultation(
  entryId: string,
  patientUserId: string,
): Promise<void> {
  const entry = await db.humanitarianQueueEntry.findUnique({
    where: { id: entryId },
    select: { id: true, patientUserId: true, status: true, poolId: true, volunteerId: true },
  });
  if (!entry || entry.patientUserId !== patientUserId) {
    throw new Error("Forbidden");
  }
  if (!["CALLED", "IN_PROGRESS"].includes(entry.status)) {
    return;
  }

  const now = new Date();
  await db.$transaction(async (tx) => {
    const updated = await tx.humanitarianQueueEntry.updateMany({
      where: {
        id: entryId,
        patientUserId,
        status: { in: ["CALLED", "IN_PROGRESS"] },
      },
      data: {
        status: "DONE",
        endedAt: now,
        completionChannel: "VIDEO",
      },
    });
    if (updated.count === 0) return;

    if (entry.volunteerId) {
      await tx.humanitarianVolunteer.update({
        where: { id: entry.volunteerId },
        data: { status: "ONLINE", currentEntryId: null },
      });
    }
  });

  await assignNextInPool(entry.poolId);
}

export async function cancelHumanitarianEntry(
  entryId: string,
  patientUserId: string,
): Promise<{ poolId: string } | null> {
  const entry = await db.humanitarianQueueEntry.findUnique({
    where: { id: entryId },
    select: { id: true, patientUserId: true, status: true, poolId: true, volunteerId: true },
  });
  if (!entry || entry.patientUserId !== patientUserId) return null;
  if (!["WAITING", "CALLED"].includes(entry.status)) return null;

  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.humanitarianQueueEntry.update({
      where: { id: entry.id },
      data: { status: "CANCELLED", endedAt: now },
    });
    if (entry.volunteerId) {
      await tx.humanitarianVolunteer.update({
        where: { id: entry.volunteerId },
        data: { status: "ONLINE", currentEntryId: null },
      });
    }
  });

  await assignNextInPool(entry.poolId);
  return { poolId: entry.poolId };
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

export async function getEntryStatus(entryId: string, patientUserId: string, lang = "es") {
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

  await expireAllHumanitarianNoShows();
  await expireStaleVolunteers();
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
    where: {
      poolId: refreshed.poolId,
      status: { in: ["ONLINE", "BUSY"] },
      lastSeenAt: { gte: presenceCutoff() },
    },
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
    poolLabel: poolLabel(refreshed.pool, lang),
    professionalName,
    campaignActive: refreshed.pool.campaign.active,
    campaignSlug: refreshed.pool.campaign.slug,
    completionChannel: refreshed.completionChannel ?? null,
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

export class HumanitarianQueueFullError extends Error {
  constructor() {
    super("QUEUE_FULL");
    this.name = "HumanitarianQueueFullError";
  }
}

export async function joinHumanitarianQueue(params: {
  campaignId: string;
  poolId: string;
  patientUserId: string;
  priority: HumanitarianPriority;
  chiefComplaint?: string | null;
  maxWaiting: number;
  intakeId?: string | null;
}): Promise<HumanitarianQueueEntry> {
  return db.$transaction(
    async (tx) => {
      const activeCount = await tx.humanitarianQueueEntry.count({
        where: {
          poolId: params.poolId,
          status: { in: [...WAITING_ENTRY_STATUSES] },
        },
      });
      if (activeCount >= params.maxWaiting) {
        throw new HumanitarianQueueFullError();
      }

      const last = await tx.humanitarianQueueEntry.findFirst({
        where: { poolId: params.poolId },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      const position = (last?.position ?? 0) + 1;

      return tx.humanitarianQueueEntry.create({
        data: {
          campaignId: params.campaignId,
          poolId: params.poolId,
          patientUserId: params.patientUserId,
          status: "WAITING",
          priority: params.priority,
          position,
          chiefComplaint: params.chiefComplaint || null,
          intakeId: params.intakeId || null,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
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
          where: {
            poolId: pool.id,
            status: "ONLINE",
            lastSeenAt: { gte: presenceCutoff() },
          },
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
  providerType: "HEALTH" | "PSYCHOANALYST" | "INTEGRATIVE_THERAPIST";
  professionalId?: string;
  psychoanalystId?: string;
  integrativeTherapistId?: string;
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
      specialty: "Psican\u00e1lise",
    };
  }

  if (role === "INTEGRATIVE_THERAPIST") {
    const it = await db.integrativeTherapistProfile.findUnique({
      where: { userId },
      select: { id: true, firstName: true, lastName: true, picsPractices: true },
    });
    if (!it) return null;
    const practiceLabel = it.picsPractices.length > 0 ? it.picsPractices.join(", ") : "PICS";
    return {
      userId,
      providerType: "INTEGRATIVE_THERAPIST",
      integrativeTherapistId: it.id,
      displayName: `${it.firstName} ${it.lastName}`,
      specialty: practiceLabel,
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

export { resolveProfessionalPoolSlug } from "@/lib/humanitarian/pool-slugs";

export function poolMatchesVolunteer(
  poolSlug: string,
  profile: VolunteerProfile,
  role: string,
): boolean {
  const def = DEFAULT_VENEZUELA_POOLS.find((p) => p.slug === poolSlug);
  if (!def) return true;
  if (!def.volunteerRoles.includes(role as "PROFESSIONAL" | "PSYCHOANALYST" | "INTEGRATIVE_THERAPIST")) {
    return false;
  }

  if (role === "PROFESSIONAL") {
    return poolSlug === resolveProfessionalPoolSlug(profile.specialty ?? "");
  }

  return true;
}
