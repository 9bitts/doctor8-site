import type { AngelTrack } from "@prisma/client";
import { db } from "@/lib/db";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { createNotification } from "@/lib/notifications";

export const MILESTONE_DEFS = [
  { key: "patients_1", kind: "patients", threshold: 1 },
  { key: "patients_5", kind: "patients", threshold: 5 },
  { key: "patients_10", kind: "patients", threshold: 10 },
  { key: "patients_25", kind: "patients", threshold: 25 },
  { key: "missions_5", kind: "missions", threshold: 5 },
  { key: "missions_20", kind: "missions", threshold: 20 },
  { key: "missions_50", kind: "missions", threshold: 50 },
  { key: "hours_10", kind: "hours", threshold: 10 },
  { key: "hours_50", kind: "hours", threshold: 50 },
  { key: "hours_100", kind: "hours", threshold: 100 },
] as const;

export function angelCertMinMinutes(): number {
  const hours = Number(process.env.ANGEL_CERT_MIN_HOURS || 10);
  if (!Number.isFinite(hours) || hours <= 0) return 10 * 60;
  return Math.round(hours * 60);
}

export async function getAngelImpactStats(userId: string, campaignSlug = VENEZUELA_CAMPAIGN_SLUG) {
  const profile = await db.angelProfile.findUnique({
    where: { userId },
    include: {
      trackEnrollments: { where: { status: "APPROVED" } },
      milestones: { orderBy: { achievedAt: "desc" } },
      volunteerCertificate: true,
    },
  });
  if (!profile) return null;

  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: campaignSlug },
    select: { id: true, name: true },
  });

  const campaignId = campaign?.id;

  const [
    hourByTrack,
    hourMonth,
    patientsSupported,
    followUpCount,
    missionsCompleted,
    totalMinutesAgg,
  ] = await Promise.all([
    db.angelHourLog.groupBy({
      by: ["track"],
      where: { profileId: profile.id },
      _sum: { minutes: true },
    }),
    db.angelHourLog.aggregate({
      where: {
        profileId: profile.id,
        occurredAt: { gte: monthStart() },
      },
      _sum: { minutes: true },
    }),
    campaignId
      ? db.humanitarianAngelAssignment.findMany({
          where: { angelUserId: userId, campaignId },
          select: { patientUserId: true },
          distinct: ["patientUserId"],
        })
      : Promise.resolve([]),
    campaignId
      ? db.humanitarianAngelFollowUp.count({
          where: { angelUserId: userId, campaignId },
        })
      : Promise.resolve(0),
    db.angelMissionSignup.count({
      where: {
        profileId: profile.id,
        status: { in: ["ATTENDED", "COMPLETED"] },
      },
    }),
    db.angelHourLog.aggregate({
      where: { profileId: profile.id },
      _sum: { minutes: true },
    }),
  ]);

  const totalMinutes = totalMinutesAgg._sum.minutes ?? 0;
  const monthMinutes = hourMonth._sum.minutes ?? 0;
  const minMinutes = angelCertMinMinutes();

  return {
    profile: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      approvedTracks: profile.trackEnrollments.map((e) => e.track),
    },
    campaignName: campaign?.name ?? "SOS Venezuela",
    hoursByTrack: hourByTrack.map((row) => ({
      track: row.track as AngelTrack,
      minutes: row._sum.minutes ?? 0,
    })),
    monthMinutes,
    totalMinutes,
    patientsSupported: patientsSupported.length,
    followUpCount,
    missionsCompleted,
    milestones: profile.milestones.map((m) => ({
      key: m.key,
      achievedAt: m.achievedAt.toISOString(),
    })),
    certificate: profile.volunteerCertificate
      ? {
          verifyCode: profile.volunteerCertificate.verifyCode,
          issuedAt: profile.volunteerCertificate.issuedAt.toISOString(),
          totalMinutes: profile.volunteerCertificate.totalMinutes,
        }
      : null,
    certificateEligible: totalMinutes >= minMinutes,
    certificateMinMinutes: minMinutes,
  };
}

function monthStart(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function checkAndAwardMilestones(profileId: string, userId: string): Promise<string[]> {
  const [totalPatients, missions, minutesAgg, existing] = await Promise.all([
    db.humanitarianAngelAssignment.findMany({
      where: { angelUserId: userId, active: true },
      select: { patientUserId: true },
      distinct: ["patientUserId"],
    }),
    db.angelMissionSignup.count({
      where: { profileId, status: { in: ["ATTENDED", "COMPLETED"] } },
    }),
    db.angelHourLog.aggregate({
      where: { profileId },
      _sum: { minutes: true },
    }),
    db.angelMilestone.findMany({
      where: { profileId },
      select: { key: true },
    }),
  ]);

  const totalPatients = await db.humanitarianAngelAssignment.findMany({
    where: { angelUserId: userId },
    select: { patientUserId: true },
    distinct: ["patientUserId"],
  });

  const hours = Math.floor((minutesAgg._sum.minutes ?? 0) / 60);
  const have = new Set(existing.map((e) => e.key));
  const awarded: string[] = [];

  const metrics = {
    patients: totalPatients.length,
    missions,
    hours,
  };

  for (const def of MILESTONE_DEFS) {
    if (have.has(def.key)) continue;
    const value = metrics[def.kind as keyof typeof metrics];
    if (value >= def.threshold) {
      await db.angelMilestone.create({
        data: { profileId, key: def.key },
      });
      await createNotification({
        userId,
        title: "Novo marco de voluntariado",
        body: `Você alcançou o marco ${def.key.replace("_", " ")}. Parabéns!`,
        type: "system",
        data: { url: "/admin/angel/impacto", milestone: def.key },
      }).catch(() => undefined);
      awarded.push(def.key);
    }
  }

  return awarded;
}

export async function creditFollowUpHours(opts: {
  profileId: string;
  userId: string;
  minutes: number;
  followUpId: string;
  note?: string;
}): Promise<void> {
  if (opts.minutes <= 0) return;

  const { randomBytes } = await import("crypto");
  await db.angelHourLog.create({
    data: {
      id: randomBytes(16).toString("hex"),
      profileId: opts.profileId,
      track: "ESCUTA",
      minutes: opts.minutes,
      source: "followup",
      sourceId: opts.followUpId,
      note: opts.note,
    },
  });

  await checkAndAwardMilestones(opts.profileId, opts.userId);
}
