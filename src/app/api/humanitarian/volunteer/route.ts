import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  assignNextInPool,
  expireAllHumanitarianNoShows,
  expireHumanitarianNoShows,
  expireStaleVolunteers,
  expireStaleWaitingPatients,
  poolMatchesVolunteer,
  reconcileStuckBusyVolunteers,
  releaseVolunteer,
  resolveVolunteerProfile,
  revertStaleCalledToWaiting,
} from "@/lib/humanitarian/dispatcher";
import { presenceCutoff } from "@/lib/humanitarian/volunteer-presence";
import { buildIntakeSummary } from "@/lib/humanitarian/intake-summary";
import { resolvePatientHumanitarianPhone } from "@/lib/humanitarian/phone";
import {
  isVolunteerRole,
  requireVerifiedVolunteer,
} from "@/lib/humanitarian/volunteer-eligibility";
import { decrypt } from "@/lib/encryption";
import { readJsonBody } from "@/lib/safe-json";
import type { Lang } from "@/lib/i18n/translations";
import type { HumanitarianIntake, HumanitarianQueueEntry } from "@prisma/client";

export const runtime = "nodejs";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

function volunteerLang(req: NextRequest): Lang {
  const raw = new URL(req.url).searchParams.get("lang");
  if (raw === "pt" || raw === "en" || raw === "es") return raw;
  return "es";
}

type EntryWithPatient = HumanitarianQueueEntry & {
  patientUser?: {
    patientProfile: { firstName: string | null; lastName: string | null } | null;
  } | null;
  intake: HumanitarianIntake | null;
};

async function buildCurrentEntry(entry: EntryWithPatient, lang: Lang) {
  const pp = entry.patientUser?.patientProfile;
  const patientPhoneAvailable = !!(await resolvePatientHumanitarianPhone(entry.patientUserId));
  return {
    id: entry.id,
    status: entry.status,
    chiefComplaint: entry.chiefComplaint,
    meetingUrl: entry.meetingUrl,
    patientPhoneAvailable,
    patientName: pp
      ? `${safeDecrypt(pp.firstName)} ${safeDecrypt(pp.lastName)}`.trim()
      : "Paciente",
    calledAt: entry.calledAt?.toISOString() ?? null,
    expiresAt: entry.expiresAt?.toISOString() ?? null,
    intakeSummary: entry.intake ? buildIntakeSummary(entry.intake, lang) : null,
  };
}

const statusSchema = z.object({
  status: z.enum(["ONLINE", "OFFLINE"]),
  campaignSlug: z.string(),
  poolSlug: z.string(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ errorCode: "UNAUTHORIZED", error: "Unauthorized" }, { status: 401 });
  if (!isVolunteerRole(session.user.role)) {
    return NextResponse.json({ errorCode: "FORBIDDEN", error: "Forbidden" }, { status: 403 });
  }

  const verification = await requireVerifiedVolunteer(session.user.id, session.user.role);
  if (!verification.ok) {
    return NextResponse.json(
      {
        errorCode: verification.error,
        error: verification.error,
        message: "Professional verification required before volunteering.",
      },
      { status: 403 },
    );
  }

  const campaignSlug = new URL(req.url).searchParams.get("campaignSlug") || "venezuela-terremoto-2026";
  const lang = volunteerLang(req);

  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: campaignSlug },
    include: {
      pools: { orderBy: { sortOrder: "asc" } },
      volunteers: {
        where: { userId: session.user.id },
        include: {
          pool: true,
        },
      },
    },
  });

  if (!campaign) return NextResponse.json({ errorCode: "NOT_FOUND", error: "Campaign not found" }, { status: 404 });

  await expireAllHumanitarianNoShows();
  await revertStaleCalledToWaiting();
  await expireStaleWaitingPatients();
  await expireStaleVolunteers();
  await reconcileStuckBusyVolunteers();

  const profile = await resolveVolunteerProfile(session.user.id, session.user.role);
  if (!profile) return NextResponse.json({ errorCode: "NOT_FOUND", error: "Profile required" }, { status: 404 });

  const eligiblePools = campaign.pools.filter((p) =>
    poolMatchesVolunteer(p.slug, profile, session.user.role),
  );

  let currentEntry = null;
  const activeVol = campaign.volunteers.find((v) => v.status !== "OFFLINE");
  if (activeVol) {
    await db.humanitarianVolunteer.update({
      where: { id: activeVol.id },
      data: { lastSeenAt: new Date() },
    });
  }
  if (activeVol?.status === "ONLINE") {
    await expireHumanitarianNoShows(activeVol.poolId);
    await assignNextInPool(activeVol.poolId);
  }
  if (activeVol?.currentEntryId) {
    const refreshedVol = await db.humanitarianVolunteer.findUnique({
      where: { id: activeVol.id },
    });
    const entryId = refreshedVol?.currentEntryId ?? activeVol.currentEntryId;
    const entry = await db.humanitarianQueueEntry.findUnique({
      where: { id: entryId },
      include: {
        patientUser: {
          select: {
            patientProfile: { select: { firstName: true, lastName: true } },
          },
        },
        intake: true,
      },
    });
    if (entry) {
      currentEntry = await buildCurrentEntry(entry, lang);
    }
  }

  const poolStats = await Promise.all(
    eligiblePools.map(async (pool) => {
      const waiting = await db.humanitarianQueueEntry.count({
        where: { poolId: pool.id, status: "WAITING" },
      });
      const volunteersOnline = await db.humanitarianVolunteer.count({
        where: {
          poolId: pool.id,
          status: { in: ["ONLINE", "BUSY"] },
          lastSeenAt: { gte: presenceCutoff() },
        },
      });
      const myVol = campaign.volunteers.find((v) => v.poolId === pool.id);
      return {
        id: pool.id,
        slug: pool.slug,
        labelEs: pool.labelEs,
        labelPt: pool.labelPt,
        labelEn: pool.labelEn,
        waiting,
        volunteersOnline,
        myStatus: myVol?.status ?? "OFFLINE",
        volunteerId: myVol?.id ?? null,
      };
    }),
  );

  return NextResponse.json({
    campaign: {
      slug: campaign.slug,
      name: campaign.name,
      active: campaign.active,
    },
    profile,
    pools: poolStats,
    activeVolunteer: activeVol
      ? {
          id: activeVol.id,
          poolSlug: activeVol.pool.slug,
          status: activeVol.status,
        }
      : null,
    currentEntry,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ errorCode: "UNAUTHORIZED", error: "Unauthorized" }, { status: 401 });
  if (!isVolunteerRole(session.user.role)) {
    return NextResponse.json({ errorCode: "FORBIDDEN", error: "Forbidden" }, { status: 403 });
  }

  const body = await readJsonBody(req);
  if (body === null) {
    return NextResponse.json(
      { errorCode: "INVALID_BODY", error: "INVALID_BODY", message: "Invalid request body." },
      { status: 400 },
    );
  }
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { errorCode: "VALIDATION_ERROR", error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { status, campaignSlug, poolSlug } = parsed.data;

  if (status === "ONLINE") {
    const verification = await requireVerifiedVolunteer(session.user.id, session.user.role);
    if (!verification.ok) {
      return NextResponse.json(
        {
          errorCode: verification.error,
          error: verification.error,
          message: "Professional verification required before volunteering.",
        },
        { status: 403 },
      );
    }
  }

  const lang = volunteerLang(req);

  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: campaignSlug },
    include: { pools: { where: { slug: poolSlug } } },
  });
  if (!campaign?.active || !campaign.pools[0]) {
    return NextResponse.json(
      { errorCode: "CAMPAIGN_UNAVAILABLE", error: "Campaign unavailable" },
      { status: 404 },
    );
  }

  const pool = campaign.pools[0];
  const profile = await resolveVolunteerProfile(session.user.id, session.user.role);
  if (!profile) return NextResponse.json({ errorCode: "NOT_FOUND", error: "Profile required" }, { status: 404 });

  if (!poolMatchesVolunteer(poolSlug, profile, session.user.role)) {
    return NextResponse.json(
      { errorCode: "VALIDATION_ERROR", error: "Pool not eligible for your profile" },
      { status: 400 },
    );
  }

  if (status === "OFFLINE") {
    const vol = await db.humanitarianVolunteer.findUnique({
      where: {
        campaignId_userId_poolId: {
          campaignId: campaign.id,
          userId: session.user.id,
          poolId: pool.id,
        },
      },
    });
    if (vol) await releaseVolunteer(vol.id);
    return NextResponse.json({ success: true, status: "OFFLINE" });
  }

  const existingVol = await db.humanitarianVolunteer.findUnique({
    where: {
      campaignId_userId_poolId: {
        campaignId: campaign.id,
        userId: session.user.id,
        poolId: pool.id,
      },
    },
  });
  if (existingVol?.status === "BUSY") {
    return NextResponse.json(
      { errorCode: "VALIDATION_ERROR", error: "Complete your current consultation before going online again." },
      { status: 400 },
    );
  }

  const otherActive = await db.humanitarianVolunteer.findFirst({
    where: {
      userId: session.user.id,
      campaignId: campaign.id,
      status: { in: ["ONLINE", "BUSY"] },
      NOT: { poolId: pool.id },
    },
  });
  if (otherActive) {
    return NextResponse.json(
      { errorCode: "ALREADY_IN_QUEUE", error: "Already volunteering in another pool. Go offline first." },
      { status: 400 },
    );
  }

  const volunteer = await db.humanitarianVolunteer.upsert({
    where: {
      campaignId_userId_poolId: {
        campaignId: campaign.id,
        userId: session.user.id,
        poolId: pool.id,
      },
    },
    create: {
      campaignId: campaign.id,
      poolId: pool.id,
      userId: session.user.id,
      providerType: profile.providerType,
      professionalId: profile.professionalId ?? null,
      psychoanalystId: profile.psychoanalystId ?? null,
      integrativeTherapistId: profile.integrativeTherapistId ?? null,
      status: "ONLINE",
      lastSeenAt: new Date(),
    },
    update: {
      status: "ONLINE",
      lastSeenAt: new Date(),
    },
  });

  await expireHumanitarianNoShows(pool.id);
  await assignNextInPool(pool.id);

  const refreshed = await db.humanitarianVolunteer.findUnique({
    where: { id: volunteer.id },
    include: {
      pool: true,
    },
  });

  let currentEntry = null;
  if (refreshed?.currentEntryId) {
    const entry = await db.humanitarianQueueEntry.findUnique({
      where: { id: refreshed.currentEntryId },
      include: {
        patientUser: {
          select: { patientProfile: { select: { firstName: true, lastName: true } } },
        },
        intake: true,
      },
    });
    if (entry) {
      currentEntry = await buildCurrentEntry(entry, lang);
    }
  }

  return NextResponse.json({
    volunteer: refreshed,
    currentEntry,
    status: refreshed?.status ?? "ONLINE",
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ errorCode: "UNAUTHORIZED", error: "Unauthorized" }, { status: 401 });
  if (!["PROFESSIONAL", "PSYCHOANALYST", "INTEGRATIVE_THERAPIST"].includes(session.user.role)) {
    return NextResponse.json({ errorCode: "FORBIDDEN", error: "Forbidden" }, { status: 403 });
  }

  const campaignSlug = new URL(req.url).searchParams.get("campaignSlug") || "venezuela-terremoto-2026";
  const lang = volunteerLang(req);

  const vol = await db.humanitarianVolunteer.findFirst({
    where: {
      userId: session.user.id,
      status: { in: ["ONLINE", "BUSY"] },
      campaign: { slug: campaignSlug },
    },
    include: { pool: true },
  });

  if (!vol) return NextResponse.json({ ok: true });

  await expireAllHumanitarianNoShows();
  await revertStaleCalledToWaiting();
  await expireStaleWaitingPatients();
  await expireStaleVolunteers();
  await reconcileStuckBusyVolunteers();

  await db.humanitarianVolunteer.update({
    where: { id: vol.id },
    data: { lastSeenAt: new Date() },
  });

  if (vol.status === "ONLINE") {
    await assignNextInPool(vol.poolId);
  }

  const refreshedVol = await db.humanitarianVolunteer.findUnique({
    where: { id: vol.id },
  });

  let currentEntry = null;
  const entryId = refreshedVol?.currentEntryId ?? vol.currentEntryId;
  if (entryId) {
    const entry = await db.humanitarianQueueEntry.findUnique({
      where: { id: entryId },
      include: {
        patientUser: {
          select: { patientProfile: { select: { firstName: true, lastName: true } } },
        },
        intake: true,
      },
    });
    if (entry) {
      currentEntry = await buildCurrentEntry(entry, lang);
    }
  }

  return NextResponse.json({
    volunteerStatus: refreshedVol?.status ?? vol.status,
    currentEntry,
  });
}
