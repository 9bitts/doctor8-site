import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { randomBytes } from "crypto";
import {
  screeningRequirementForTrack,
  screeningSatisfiesRequirement,
} from "@/lib/humanitarian/angel-tracks";
import {
  sendAngelApprovedEmail,
  sendAngelRejectedEmail,
  sendAngelTrackApprovedEmail,
} from "@/lib/email";
import type { AngelScreeningStatus, AngelTrack, AngelTrackStatus } from "@prisma/client";

function randomId(): string {
  return randomBytes(16).toString("hex");
}

async function notifyAngelUser(
  userId: string,
  send: (user: { email: string; language: string | null; firstName: string; lastName: string }) => Promise<void>,
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      language: true,
      angelProfile: { select: { firstName: true, lastName: true } },
    },
  });
  if (!user?.email || !user.angelProfile) return;
  try {
    await send({
      email: user.email,
      language: user.language,
      firstName: user.angelProfile.firstName,
      lastName: user.angelProfile.lastName,
    });
  } catch (err) {
    console.error("[admin/humanitarian/angels] email notification failed", { userId, err });
  }
}

const patchSchema = z.object({
  userId: z.string(),
  action: z.enum([
    "approve",
    "reject",
    "pause",
    "reactivate",
    "approveTrack",
    "pauseTrack",
    "revokeTrack",
    "setScreening",
  ]),
  track: z.enum([
    "ESCUTA",
    "CAMPO",
    "ENTREGAS",
    "PROFISSIONAL",
    "INTERPRETE",
    "RETAGUARDA",
    "EDUCADOR",
    "EMBAIXADOR",
  ]).optional(),
  screeningStatus: z.enum(["NOT_SUBMITTED", "SUBMITTED", "IN_REVIEW", "VERIFIED", "REJECTED"]).optional(),
  screeningNotes: z.string().max(2000).optional(),
  rejectionReason: z.string().max(500).optional(),
  campaignSlug: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const angels = await db.angelProfile.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      trackEnrollments: true,
      user: {
        select: {
          id: true,
          email: true,
          emailVerified: true,
          region: true,
          language: true,
          createdAt: true,
          humanitarianAngels: {
            select: { active: true, campaign: { select: { slug: true } } },
          },
          _count: { select: { providerLicenseDocuments: true } },
        },
      },
    },
  });

  return NextResponse.json({
    angels: angels.map((a) => ({
      id: a.id,
      userId: a.userId,
      firstName: a.firstName,
      lastName: a.lastName,
      profession: a.profession,
      volunteerHelp: a.volunteerHelp,
      languages: a.languages,
      motivation: a.motivation,
      preferredCampaignSlug: a.preferredCampaignSlug,
      approvalStatus: a.approvalStatus,
      approvedAt: a.approvedAt?.toISOString() ?? null,
      rejectionReason: a.rejectionReason,
      screeningStatus: a.screeningStatus,
      screeningReviewedAt: a.screeningReviewedAt?.toISOString() ?? null,
      trackEnrollments: (a.trackEnrollments || []).map((e) => ({
        track: e.track,
        status: e.status,
        approvedAt: e.approvedAt?.toISOString() ?? null,
      })),
      email: a.user.email,
      emailVerified: !!a.user.emailVerified,
      region: a.user.region,
      licenseDocCount: a.user._count.providerLicenseDocuments,
      hasPhone: Boolean(a.phone),
      enrollmentActive: a.user.humanitarianAngels.some((e) => e.active),
      createdAt: a.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const profile = await db.angelProfile.findFirst({
    where: { userId: parsed.data.userId },
    include: { trackEnrollments: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "Angel not found" }, { status: 404 });
  }

  const campaignSlug =
    parsed.data.campaignSlug || profile.preferredCampaignSlug || VENEZUELA_CAMPAIGN_SLUG;

  if (parsed.data.action === "setScreening") {
    const screeningStatus = parsed.data.screeningStatus as AngelScreeningStatus | undefined;
    if (!screeningStatus) {
      return NextResponse.json({ error: "screeningStatus required" }, { status: 400 });
    }
    await db.angelProfile.update({
      where: { id: profile.id },
      data: {
        screeningStatus,
        screeningNotes: parsed.data.screeningNotes?.trim() || null,
        screeningReviewedAt: new Date(),
        screeningReviewedById: session.user.id,
      },
    });
    return NextResponse.json({ success: true });
  }

  if (
    parsed.data.action === "approveTrack"
    || parsed.data.action === "pauseTrack"
    || parsed.data.action === "revokeTrack"
  ) {
    const track = parsed.data.track as AngelTrack | undefined;
    if (!track) {
      return NextResponse.json({ error: "track required" }, { status: 400 });
    }
    if (profile.approvalStatus !== "APPROVED") {
      return NextResponse.json({ error: "Angel must be approved before track changes" }, { status: 400 });
    }

    if (parsed.data.action === "approveTrack") {
      const requirement = screeningRequirementForTrack(track);
      if (!screeningSatisfiesRequirement(profile.screeningStatus, requirement)) {
        return NextResponse.json(
          { error: `Screening requirement not met for ${track}` },
          { status: 400 },
        );
      }
    }

    const nextStatus: AngelTrackStatus =
      parsed.data.action === "approveTrack"
        ? "APPROVED"
        : parsed.data.action === "pauseTrack"
          ? "PAUSED"
          : "REVOKED";

    await db.angelTrackEnrollment.upsert({
      where: { profileId_track: { profileId: profile.id, track } },
      create: {
        id: randomId(),
        profileId: profile.id,
        track,
        status: nextStatus,
        approvedAt: nextStatus === "APPROVED" ? new Date() : null,
        approvedById: nextStatus === "APPROVED" ? session.user.id : null,
      },
      update: {
        status: nextStatus,
        approvedAt: nextStatus === "APPROVED" ? new Date() : null,
        approvedById: nextStatus === "APPROVED" ? session.user.id : null,
      },
    });

    if (nextStatus === "APPROVED") {
      await notifyAngelUser(parsed.data.userId, async (user) => {
        const name = `${user.firstName} ${user.lastName}`.trim() || "Voluntário";
        await sendAngelTrackApprovedEmail({
          email: user.email,
          name,
          track,
          language: user.language ?? undefined,
        });
      });
    }

    return NextResponse.json({ success: true });
  }

  if (parsed.data.action === "pause") {
    await db.humanitarianAngel.updateMany({
      where: { userId: parsed.data.userId },
      data: { active: false },
    });
    return NextResponse.json({ success: true, status: "PAUSED" });
  }

  if (parsed.data.action === "reactivate") {
    if (profile.approvalStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Angel must be approved before reactivation" },
        { status: 400 },
      );
    }
    const campaign = await db.humanitarianCampaign.findUnique({
      where: { slug: campaignSlug },
      select: { id: true },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    await db.humanitarianAngel.upsert({
      where: {
        campaignId_userId: { campaignId: campaign.id, userId: parsed.data.userId },
      },
      create: {
        campaignId: campaign.id,
        userId: parsed.data.userId,
        active: true,
      },
      update: { active: true },
    });
    return NextResponse.json({ success: true, status: "REACTIVATED" });
  }

  if (parsed.data.action === "reject") {
    await db.$transaction(async (tx) => {
      await tx.angelProfile.update({
        where: { id: profile.id },
        data: {
          approvalStatus: "REJECTED",
          rejectionReason: parsed.data.rejectionReason || null,
          approvedAt: null,
          approvedById: null,
        },
      });
      await tx.humanitarianAngel.updateMany({
        where: { userId: parsed.data.userId },
        data: { active: false },
      });
    });
    await notifyAngelUser(parsed.data.userId, async (user) => {
      const name = `${user.firstName} ${user.lastName}`.trim() || "Voluntário";
      await sendAngelRejectedEmail({
        email: user.email,
        name,
        rejectionReason: parsed.data.rejectionReason,
        language: user.language ?? undefined,
      });
    });
    return NextResponse.json({ success: true, status: "REJECTED" });
  }

  const user = await db.user.findUnique({
    where: { id: parsed.data.userId },
    select: { emailVerified: true },
  });
  if (!user?.emailVerified) {
    return NextResponse.json(
      { error: "Email must be verified before approval" },
      { status: 400 },
    );
  }

  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: campaignSlug },
    select: { id: true },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  await db.$transaction(async (tx) => {
    await tx.angelProfile.update({
      where: { id: profile.id },
      data: {
        approvalStatus: "APPROVED",
        approvedAt: new Date(),
        approvedById: session.user!.id,
        rejectionReason: null,
      },
    });

    // Back-compat: approving the angel also approves ESCUTA track unless explicitly set otherwise.
    await tx.angelTrackEnrollment.upsert({
      where: { profileId_track: { profileId: profile.id, track: "ESCUTA" } },
      create: {
        id: randomId(),
        profileId: profile.id,
        track: "ESCUTA",
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById: session.user!.id,
      },
      update: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById: session.user!.id,
      },
    });

    await tx.humanitarianAngel.upsert({
      where: {
        campaignId_userId: { campaignId: campaign.id, userId: parsed.data.userId },
      },
      create: {
        campaignId: campaign.id,
        userId: parsed.data.userId,
        active: true,
      },
      update: { active: true },
    });
  });

  await notifyAngelUser(parsed.data.userId, async (user) => {
    const name = `${user.firstName} ${user.lastName}`.trim() || "Voluntário";
    await sendAngelApprovedEmail({
      email: user.email,
      name,
      language: user.language ?? undefined,
    });
  });

  return NextResponse.json({ success: true, status: "APPROVED" });
}
