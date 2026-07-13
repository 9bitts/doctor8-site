import { randomBytes } from "crypto";
import type { AngelTrack } from "@prisma/client";
import { db } from "@/lib/db";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { createNotification } from "@/lib/notifications";

const BURNOUT_WINDOW = 10;
const BURNOUT_THRESHOLD = 3;
const WELLBEING_INTERVAL_DAYS = 7;
const DEFAULT_INACTIVE_DAYS = 14;

function randomId(): string {
  return randomBytes(16).toString("hex");
}

export function isBurnoutRisk(stressfulOutcomes: number, windowSize: number): boolean {
  return windowSize >= BURNOUT_WINDOW && stressfulOutcomes >= BURNOUT_THRESHOLD;
}

/** Recent ESCUTA follow-ups with NEEDS_HELP or ESCALATED — burnout signal. */
export async function getAngelBurnoutSignal(userId: string): Promise<{
  atRisk: boolean;
  stressfulCount: number;
  windowSize: number;
}> {
  const followUps = await db.humanitarianAngelFollowUp.findMany({
    where: { angelUserId: userId },
    orderBy: { contactedAt: "desc" },
    take: BURNOUT_WINDOW,
    select: { outcome: true },
  });

  const stressfulCount = followUps.filter(
    (f) => f.outcome === "NEEDS_HELP" || f.outcome === "ESCALATED",
  ).length;

  return {
    atRisk: isBurnoutRisk(stressfulCount, followUps.length),
    stressfulCount,
    windowSize: followUps.length,
  };
}

export async function wellbeingCheckinDue(profileId: string): Promise<boolean> {
  const latest = await db.angelWellbeingCheckin.findFirst({
    where: { profileId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (!latest) return true;
  const days = (Date.now() - latest.createdAt.getTime()) / (24 * 60 * 60 * 1000);
  return days >= WELLBEING_INTERVAL_DAYS;
}

export async function submitWellbeingCheckin(opts: {
  userId: string;
  score: number;
  note?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await db.angelProfile.findUnique({
    where: { userId: opts.userId },
    select: { id: true },
  });
  if (!profile) return { ok: false, error: "PROFILE_NOT_FOUND" };

  await db.angelWellbeingCheckin.create({
    data: {
      id: randomId(),
      profileId: profile.id,
      score: opts.score,
      note: opts.note?.trim() || null,
    },
  });

  return { ok: true };
}

export async function addSupervisionNote(opts: {
  profileId: string;
  authorId: string;
  note: string;
}): Promise<void> {
  await db.angelSupervisionNote.create({
    data: {
      id: randomId(),
      profileId: opts.profileId,
      authorId: opts.authorId,
      note: opts.note.trim(),
    },
  });
}

export async function publishAngelAnnouncement(opts: {
  campaignSlug?: string;
  track?: AngelTrack | null;
  title: string;
  body: string;
  createdById: string;
}): Promise<{ announcementId: string; notified: number }> {
  let campaignId: string | null = null;
  if (opts.campaignSlug) {
    const campaign = await db.humanitarianCampaign.findUnique({
      where: { slug: opts.campaignSlug },
      select: { id: true },
    });
    campaignId = campaign?.id ?? null;
  }

  const announcement = await db.angelAnnouncement.create({
    data: {
      id: randomId(),
      campaignId,
      track: opts.track ?? null,
      title: opts.title.trim(),
      body: opts.body.trim(),
      createdById: opts.createdById,
      publishedAt: new Date(),
    },
  });

  const enrollments = await db.angelTrackEnrollment.findMany({
    where: {
      status: "APPROVED",
      ...(opts.track ? { track: opts.track } : {}),
      profile: { approvalStatus: "APPROVED" },
    },
    include: {
      profile: { select: { userId: true } },
    },
  });

  let userIds = enrollments.map((e) => e.profile.userId);

  if (campaignId) {
    const active = await db.humanitarianAngel.findMany({
      where: { campaignId, active: true },
      select: { userId: true },
    });
    const activeSet = new Set(active.map((a) => a.userId));
    userIds = userIds.filter((id) => activeSet.has(id));
  }

  const unique = [...new Set(userIds)];
  for (const userId of unique) {
    await createNotification({
      userId,
      title: opts.title.trim(),
      body: opts.body.trim().slice(0, 500),
      type: "system",
      data: { url: "/admin/angel", announcementId: announcement.id },
    }).catch(() => undefined);
  }

  return { announcementId: announcement.id, notified: unique.length };
}

export async function getCoordinatorAnalytics(campaignSlug = VENEZUELA_CAMPAIGN_SLUG) {
  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: campaignSlug },
    select: { id: true, name: true },
  });
  if (!campaign) return null;

  const [
    trackEnrollments,
    missions,
    signups,
    angels,
    assignments,
    followUps,
  ] = await Promise.all([
    db.angelTrackEnrollment.groupBy({
      by: ["track", "status"],
      _count: { id: true },
    }),
    db.angelMission.findMany({
      where: { campaignId: campaign.id },
      select: { id: true, capacity: true, status: true },
    }),
    db.angelMissionSignup.findMany({
      where: { mission: { campaignId: campaign.id } },
      select: { status: true, missionId: true },
    }),
    db.humanitarianAngel.findMany({
      where: { campaignId: campaign.id, active: true },
      include: {
        user: {
          select: {
            id: true,
            lastLoginAt: true,
            angelProfile: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    }),
    db.humanitarianAngelAssignment.findMany({
      where: { campaignId: campaign.id },
      select: { id: true, angelUserId: true, patientUserId: true, claimedAt: true },
    }),
    db.humanitarianAngelFollowUp.findMany({
      where: { campaignId: campaign.id },
      select: { angelUserId: true, patientUserId: true, contactedAt: true },
      orderBy: { contactedAt: "asc" },
    }),
  ]);

  const activeByTrack: Record<string, number> = {};
  for (const row of trackEnrollments) {
    if (row.status !== "APPROVED") continue;
    activeByTrack[row.track] = (activeByTrack[row.track] ?? 0) + row._count.id;
  }

  const confirmed = signups.filter((s) => s.status === "CONFIRMED").length;
  const attended = signups.filter((s) => ["ATTENDED", "COMPLETED"].includes(s.status)).length;
  const noShow = signups.filter((s) => s.status === "NO_SHOW").length;
  const totalCapacity = missions
    .filter((m) => ["OPEN", "FULL", "COMPLETED"].includes(m.status))
    .reduce((sum, m) => sum + m.capacity, 0);

  const firstContactHours: number[] = [];
  const followUpByAssignment = new Map<string, Date>();
  for (const fu of followUps) {
    const key = `${fu.angelUserId}:${fu.patientUserId}`;
    if (!followUpByAssignment.has(key)) {
      followUpByAssignment.set(key, fu.contactedAt);
    }
  }
  for (const a of assignments) {
    const first = followUpByAssignment.get(`${a.angelUserId}:${a.patientUserId}`);
    if (first) {
      const hours = (first.getTime() - a.claimedAt.getTime()) / 3_600_000;
      if (hours >= 0) firstContactHours.push(hours);
    }
  }
  const avgFirstContactHours =
    firstContactHours.length > 0
      ? Math.round((firstContactHours.reduce((s, h) => s + h, 0) / firstContactHours.length) * 10) / 10
      : null;

  const cutoff = new Date(Date.now() - DEFAULT_INACTIVE_DAYS * 24 * 60 * 60 * 1000);
  const inactiveAngels: {
    userId: string;
    profileId: string;
    name: string;
    lastLoginAt: string | null;
    burnoutRisk?: boolean;
  }[] = [];

  for (const angel of angels) {
    const profile = angel.user.angelProfile;
    if (!profile) continue;

    const [lastFollowUp, lastSignup, lastHour, burnout] = await Promise.all([
      db.humanitarianAngelFollowUp.findFirst({
        where: { angelUserId: angel.userId },
        orderBy: { contactedAt: "desc" },
        select: { contactedAt: true },
      }),
      db.angelMissionSignup.findFirst({
        where: { profileId: profile.id },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      db.angelHourLog.findFirst({
        where: { profileId: profile.id },
        orderBy: { occurredAt: "desc" },
        select: { occurredAt: true },
      }),
      getAngelBurnoutSignal(angel.userId),
    ]);

    const lastActivity = [
      lastFollowUp?.contactedAt,
      lastSignup?.updatedAt,
      lastHour?.occurredAt,
      angel.user.lastLoginAt,
    ]
      .filter(Boolean)
      .map((d) => d!.getTime());
    const maxActivity = lastActivity.length ? Math.max(...lastActivity) : 0;

    if (maxActivity < cutoff.getTime()) {
      inactiveAngels.push({
        userId: angel.userId,
        profileId: profile.id,
        name: `${profile.firstName} ${profile.lastName}`.trim(),
        lastLoginAt: angel.user.lastLoginAt?.toISOString() ?? null,
        ...(burnout.atRisk ? { burnoutRisk: true } : {}),
      });
    }
  }

  const burnoutAngels = await Promise.all(
    angels.map(async (a) => {
      const b = await getAngelBurnoutSignal(a.userId);
      if (!b.atRisk || !a.user.angelProfile) return null;
      return {
        userId: a.user.id,
        profileId: a.user.angelProfile.id,
        name: `${a.user.angelProfile.firstName} ${a.user.angelProfile.lastName}`.trim(),
        stressfulCount: b.stressfulCount,
      };
    }),
  );

  return {
    campaignName: campaign.name,
    activeByTrack,
    activeAngelCount: angels.length,
    missionStats: {
      openMissions: missions.filter((m) => m.status === "OPEN" || m.status === "FULL").length,
      fillRate: totalCapacity > 0 ? Math.round((confirmed / totalCapacity) * 100) : null,
      attended,
      noShow,
      noShowRate: attended + noShow > 0 ? Math.round((noShow / (attended + noShow)) * 100) : null,
    },
    avgFirstContactHours,
    inactiveAngels,
    burnoutAngels: burnoutAngels.filter(Boolean),
  };
}

export async function sendInactiveAngelNudges(
  inactiveDays = DEFAULT_INACTIVE_DAYS,
): Promise<number> {
  const analytics = await getCoordinatorAnalytics();
  if (!analytics) return 0;

  let sent = 0;
  for (const angel of analytics.inactiveAngels) {
    await createNotification({
      userId: angel.userId,
      title: "Sentimos sua falta no programa Anjo",
      body: "Faz um tempo que você não registra atividade. Se precisar de pausa, atualize seu perfil. Se puder voltar, há pacientes e missões esperando.",
      type: "system",
      data: { url: "/admin/angel" },
    }).catch(() => undefined);
    sent += 1;
  }
  return sent;
}
