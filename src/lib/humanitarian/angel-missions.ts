import { randomBytes } from "crypto";
import type {
  AngelAvailabilityStatus,
  AngelMission,
  AngelMissionStatus,
  AngelProfile,
  AngelSignupStatus,
  AngelTrack,
} from "@prisma/client";
import { db } from "@/lib/db";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import {
  screeningRequirementForTrack,
  screeningSatisfiesRequirement,
} from "@/lib/humanitarian/angel-tracks";
import { hasCompletedTrackTraining } from "@/lib/humanitarian/angel-training";

export type MissionEligibilityCode =
  | "PROFILE_NOT_FOUND"
  | "TRACK_NOT_APPROVED"
  | "SCREENING_REQUIRED"
  | "TRAINING_REQUIRED"
  | "PAUSED"
  | "VEHICLE_REQUIRED"
  | "LANGUAGE_REQUIRED"
  | "MISSION_NOT_OPEN"
  | "ALREADY_SIGNED_UP"
  | "MISSION_NOT_FOUND";

export type MissionEligibility =
  | { ok: true }
  | { ok: false; code: MissionEligibilityCode; requiredCourseIds?: string[] };

function randomId(): string {
  return randomBytes(16).toString("hex");
}

export function isProfilePaused(
  availabilityStatus: AngelAvailabilityStatus,
  pausedUntil: Date | null | undefined,
): boolean {
  if (availabilityStatus === "PAUSED") return true;
  if (pausedUntil && pausedUntil.getTime() > Date.now()) return true;
  return false;
}

export function missionDefaultMinutes(mission: Pick<AngelMission, "type" | "startsAt" | "endsAt" | "estimatedMinutes">): number {
  if (mission.type === "TAREFA" && mission.estimatedMinutes) return mission.estimatedMinutes;
  if (mission.startsAt && mission.endsAt) {
    const diff = Math.round((mission.endsAt.getTime() - mission.startsAt.getTime()) / 60_000);
    if (diff > 0) return diff;
  }
  if (mission.estimatedMinutes) return mission.estimatedMinutes;
  return 60;
}

export function computeMissionMatchScore(
  profile: Pick<AngelProfile, "languages" | "city" | "skills">,
  mission: Pick<AngelMission, "requiredLanguages" | "location" | "isRemote">,
): number {
  let score = 0;
  const langs = (profile.languages || []).map((l) => l.toLowerCase());
  const required = (mission.requiredLanguages || []).map((l) => l.toLowerCase());
  if (required.length > 0) {
    const matched = required.filter((r) => langs.some((l) => l.includes(r) || r.includes(l)));
    score += matched.length * 10;
  } else if (langs.length > 0) {
    score += 2;
  }
  if (!mission.isRemote && profile.city && mission.location) {
    const city = profile.city.toLowerCase();
    const loc = mission.location.toLowerCase();
    if (loc.includes(city) || city.includes(loc.split(",")[0]?.trim() ?? "")) {
      score += 5;
    }
  }
  if ((profile.skills || []).length > 0) score += 1;
  return score;
}

export async function loadAngelProfileForMissions(userId: string) {
  return db.angelProfile.findUnique({
    where: { userId },
    include: { trackEnrollments: true },
  });
}

export async function checkMissionSignupEligibility(opts: {
  profile: AngelProfile & { trackEnrollments: { track: AngelTrack; status: string }[] };
  userId: string;
  mission: AngelMission;
  existingSignupStatus?: AngelSignupStatus | null;
}): Promise<MissionEligibility> {
  const { profile, userId, mission, existingSignupStatus } = opts;

  if (existingSignupStatus && existingSignupStatus !== "CANCELLED" && existingSignupStatus !== "DECLINED") {
    return { ok: false, code: "ALREADY_SIGNED_UP" };
  }

  if (mission.status !== "OPEN" && mission.status !== "FULL") {
    return { ok: false, code: "MISSION_NOT_OPEN" };
  }

  if (isProfilePaused(profile.availabilityStatus, profile.pausedUntil)) {
    return { ok: false, code: "PAUSED" };
  }

  const trackEnrollment = profile.trackEnrollments.find((e) => e.track === mission.track);
  if (!trackEnrollment || trackEnrollment.status !== "APPROVED") {
    return { ok: false, code: "TRACK_NOT_APPROVED" };
  }

  const screeningReq = screeningRequirementForTrack(mission.track);
  if (!screeningSatisfiesRequirement(profile.screeningStatus, screeningReq)) {
    return { ok: false, code: "SCREENING_REQUIRED" };
  }

  const training = await hasCompletedTrackTraining({ userId, track: mission.track });
  if (!training.ok) {
    return { ok: false, code: "TRAINING_REQUIRED", requiredCourseIds: training.requiredCourseIds };
  }

  if (mission.requiresVehicle && !profile.hasVehicle) {
    return { ok: false, code: "VEHICLE_REQUIRED" };
  }

  if (mission.requiredLanguages.length > 0) {
    const langs = (profile.languages || []).map((l) => l.toLowerCase());
    const okLang = mission.requiredLanguages.some((req) =>
      langs.some((l) => l.includes(req.toLowerCase()) || req.toLowerCase().includes(l)),
    );
    if (!okLang) return { ok: false, code: "LANGUAGE_REQUIRED" };
  }

  return { ok: true };
}

export async function countConfirmedSignups(missionId: string): Promise<number> {
  return db.angelMissionSignup.count({
    where: { missionId, status: "CONFIRMED" },
  });
}

export async function syncMissionCapacityStatus(missionId: string): Promise<AngelMissionStatus> {
  const mission = await db.angelMission.findUnique({
    where: { id: missionId },
    select: { capacity: true, status: true },
  });
  if (!mission) return "DRAFT";
  if (mission.status !== "OPEN" && mission.status !== "FULL") return mission.status;

  const confirmed = await countConfirmedSignups(missionId);
  const next: AngelMissionStatus = confirmed >= mission.capacity ? "FULL" : "OPEN";
  if (next !== mission.status) {
    await db.angelMission.update({
      where: { id: missionId },
      data: { status: next },
    });
  }
  return next;
}

export async function listOpenMissionsForAngel(
  userId: string,
  campaignSlug = VENEZUELA_CAMPAIGN_SLUG,
) {
  const profile = await loadAngelProfileForMissions(userId);
  if (!profile) return [];

  const approvedTracks = profile.trackEnrollments
    .filter((e) => e.status === "APPROVED")
    .map((e) => e.track);
  if (approvedTracks.length === 0) return [];

  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: campaignSlug },
    select: { id: true },
  });
  if (!campaign) return [];

  const missions = await db.angelMission.findMany({
    where: {
      campaignId: campaign.id,
      track: { in: approvedTracks },
      status: { in: ["OPEN", "FULL"] },
    },
    include: {
      signups: {
        where: { profileId: profile.id },
        select: { id: true, status: true },
      },
      _count: { select: { signups: { where: { status: "CONFIRMED" } } } },
    },
    orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
  });

  return missions
    .map((m) => ({
      id: m.id,
      track: m.track,
      type: m.type,
      title: m.title,
      description: m.description,
      isRemote: m.isRemote,
      location: m.location,
      startsAt: m.startsAt?.toISOString() ?? null,
      endsAt: m.endsAt?.toISOString() ?? null,
      capacity: m.capacity,
      requiresVehicle: m.requiresVehicle,
      requiredLanguages: m.requiredLanguages,
      estimatedMinutes: m.estimatedMinutes,
      status: m.status,
      confirmedCount: m._count.signups,
      matchScore: computeMissionMatchScore(profile, m),
      mySignup: m.signups[0]
        ? { id: m.signups[0].id, status: m.signups[0].status }
        : null,
    }))
    .sort((a, b) => b.matchScore - a.matchScore || (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));
}

export async function listMyMissionSignups(userId: string) {
  const profile = await db.angelProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) return [];

  const signups = await db.angelMissionSignup.findMany({
    where: {
      profileId: profile.id,
      status: { notIn: ["CANCELLED", "DECLINED"] },
    },
    include: {
      mission: {
        select: {
          id: true,
          title: true,
          track: true,
          type: true,
          status: true,
          startsAt: true,
          endsAt: true,
          location: true,
          isRemote: true,
          estimatedMinutes: true,
        },
      },
    },
    orderBy: [{ mission: { startsAt: "asc" } }, { createdAt: "desc" }],
  });

  return signups.map((s) => ({
    id: s.id,
    status: s.status,
    note: s.note,
    minutesCredited: s.minutesCredited,
    createdAt: s.createdAt.toISOString(),
    mission: {
      ...s.mission,
      startsAt: s.mission.startsAt?.toISOString() ?? null,
      endsAt: s.mission.endsAt?.toISOString() ?? null,
    },
  }));
}

export async function signupForMission(opts: {
  userId: string;
  missionId: string;
  note?: string;
}): Promise<{ ok: true; signupId: string; status: AngelSignupStatus } | { ok: false; code: MissionEligibilityCode; requiredCourseIds?: string[] }> {
  const profile = await loadAngelProfileForMissions(opts.userId);
  if (!profile) return { ok: false, code: "PROFILE_NOT_FOUND" };

  const mission = await db.angelMission.findUnique({ where: { id: opts.missionId } });
  if (!mission) return { ok: false, code: "MISSION_NOT_FOUND" };

  const existing = await db.angelMissionSignup.findUnique({
    where: { missionId_profileId: { missionId: mission.id, profileId: profile.id } },
    select: { status: true },
  });

  const eligibility = await checkMissionSignupEligibility({
    profile,
    userId: opts.userId,
    mission,
    existingSignupStatus: existing?.status,
  });
  if (!eligibility.ok) return eligibility;

  const confirmed = await countConfirmedSignups(mission.id);
  const initialStatus: AngelSignupStatus =
    mission.status === "FULL" || confirmed >= mission.capacity ? "PENDING" : "PENDING";

  const signup = await db.angelMissionSignup.upsert({
    where: { missionId_profileId: { missionId: mission.id, profileId: profile.id } },
    create: {
      id: randomId(),
      missionId: mission.id,
      profileId: profile.id,
      status: initialStatus,
      note: opts.note?.trim() || null,
    },
    update: {
      status: initialStatus,
      note: opts.note?.trim() || null,
    },
  });

  return { ok: true, signupId: signup.id, status: signup.status };
}

export async function cancelMissionSignup(userId: string, missionId: string): Promise<boolean> {
  const profile = await db.angelProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) return false;

  const signup = await db.angelMissionSignup.findUnique({
    where: { missionId_profileId: { missionId, profileId: profile.id } },
  });
  if (!signup) return false;
  if (!["PENDING", "CONFIRMED"].includes(signup.status)) return false;

  await db.$transaction(async (tx) => {
    await tx.angelMissionSignup.update({
      where: { id: signup.id },
      data: { status: "CANCELLED" },
    });
    if (signup.status === "CONFIRMED") {
      await syncMissionCapacityStatusTx(tx, missionId);
    }
  });

  return true;
}

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

async function syncMissionCapacityStatusTx(tx: Tx, missionId: string): Promise<void> {
  const mission = await tx.angelMission.findUnique({
    where: { id: missionId },
    select: { capacity: true, status: true },
  });
  if (!mission || (mission.status !== "OPEN" && mission.status !== "FULL")) return;

  const confirmed = await tx.angelMissionSignup.count({
    where: { missionId, status: "CONFIRMED" },
  });
  const next: AngelMissionStatus = confirmed >= mission.capacity ? "FULL" : "OPEN";
  if (next !== mission.status) {
    await tx.angelMission.update({ where: { id: missionId }, data: { status: next } });
  }
}

export async function creditSignupHours(signupId: string): Promise<number | null> {
  const signup = await db.angelMissionSignup.findUnique({
    where: { id: signupId },
    include: { mission: true },
  });
  if (!signup || signup.minutesCredited != null) return signup?.minutesCredited ?? null;
  if (signup.status !== "ATTENDED" && signup.status !== "COMPLETED") return null;

  const minutes = missionDefaultMinutes(signup.mission);
  const occurredAt = signup.mission.endsAt ?? signup.mission.startsAt ?? new Date();

  await db.$transaction(async (tx) => {
    await tx.angelMissionSignup.update({
      where: { id: signupId },
      data: { minutesCredited: minutes },
    });
    await tx.angelHourLog.create({
      data: {
        id: randomId(),
        profileId: signup.profileId,
        track: signup.mission.track,
        minutes,
        source: "mission",
        sourceId: signupId,
        occurredAt,
        note: signup.mission.title,
      },
    });
  });

  return minutes;
}

export async function creditSignupHoursWithMilestones(signupId: string, userId: string): Promise<number | null> {
  const signup = await db.angelMissionSignup.findUnique({
    where: { id: signupId },
    select: { profileId: true },
  });
  const minutes = await creditSignupHours(signupId);
  if (minutes != null && signup) {
    const { checkAndAwardMilestones } = await import("@/lib/humanitarian/angel-impact");
    await checkAndAwardMilestones(signup.profileId, userId).catch(() => undefined);
  }
  return minutes;
}

export async function updateSignupStatusAdmin(opts: {
  signupId: string;
  status: AngelSignupStatus;
  decidedById: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const signup = await db.angelMissionSignup.findUnique({
    where: { id: opts.signupId },
    include: { mission: true, profile: { select: { userId: true } } },
  });
  if (!signup) return { ok: false, error: "Signup not found" };

  await db.$transaction(async (tx) => {
    await tx.angelMissionSignup.update({
      where: { id: signup.id },
      data: {
        status: opts.status,
        decidedById: opts.decidedById,
      },
    });

    if (opts.status === "CONFIRMED") {
      await syncMissionCapacityStatusTx(tx, signup.missionId);
    } else if (signup.status === "CONFIRMED" && ["DECLINED", "CANCELLED"].includes(opts.status)) {
      await syncMissionCapacityStatusTx(tx, signup.missionId);
    }
  });

  if (opts.status === "ATTENDED" || opts.status === "COMPLETED") {
    await creditSignupHoursWithMilestones(signup.id, signup.profile.userId);
  }

  return { ok: true };
}

export async function sendDueMissionReminders(): Promise<number> {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const windowStart = new Date(in24h.getTime() - 30 * 60 * 1000);
  const windowEnd = new Date(in24h.getTime() + 30 * 60 * 1000);

  const signups = await db.angelMissionSignup.findMany({
    where: {
      status: "CONFIRMED",
      reminderSentAt: null,
      mission: {
        type: "TURNO",
        startsAt: { gte: windowStart, lte: windowEnd },
        status: { in: ["OPEN", "FULL"] },
      },
    },
    include: {
      mission: { select: { title: true, startsAt: true } },
      profile: {
        select: {
          userId: true,
          user: { select: { email: true, language: true } },
        },
      },
    },
    take: 100,
  });

  let sent = 0;
  for (const s of signups) {
    if (!s.mission.startsAt) continue;
    const { createNotification } = await import("@/lib/notifications");
    const { sendAngelMissionReminderEmail } = await import("@/lib/email");

    const panelUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://doctor8.org"}/admin/angel/missoes`;
    await createNotification({
      userId: s.profile.userId,
      title: "Lembrete de turno",
      body: `Seu turno "${s.mission.title}" começa em cerca de 24 horas.`,
      type: "appointment_reminder",
      data: { url: "/admin/angel/missoes", missionId: s.missionId },
    });

    if (s.profile.user.email) {
      try {
        await sendAngelMissionReminderEmail({
          email: s.profile.user.email,
          missionTitle: s.mission.title,
          startsAt: s.mission.startsAt,
          panelUrl,
          language: s.profile.user.language ?? undefined,
        });
      } catch {
        /* email optional */
      }
    }

    await db.angelMissionSignup.update({
      where: { id: s.id },
      data: { reminderSentAt: new Date() },
    });
    sent += 1;
  }

  return sent;
}
