import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import {
  sendAngelApprovedEmail,
  sendAngelRejectedEmail,
} from "@/lib/email";

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
    console.error("[angel-admin-approval] email notification failed", { userId, err });
  }
}

export type AngelApprovalResult =
  | { ok: true; status: "APPROVED" | "REJECTED" }
  | { ok: false; error: string; status: number };

/** Full angel activation: APPROVED + ESCUTA track + campaign enrollment + email. */
export async function approveAngelVolunteer(opts: {
  profileId?: string;
  userId?: string;
  adminUserId: string;
  campaignSlug?: string | null;
}): Promise<AngelApprovalResult> {
  const profile = await db.angelProfile.findFirst({
    where: opts.profileId
      ? { id: opts.profileId }
      : opts.userId
        ? { userId: opts.userId }
        : { id: "__missing__" },
  });
  if (!profile) {
    return { ok: false, error: "Angel not found", status: 404 };
  }

  const user = await db.user.findUnique({
    where: { id: profile.userId },
    select: { emailVerified: true },
  });
  if (!user?.emailVerified) {
    return { ok: false, error: "Email must be verified before approval", status: 400 };
  }

  const campaignSlug =
    opts.campaignSlug || profile.preferredCampaignSlug || VENEZUELA_CAMPAIGN_SLUG;
  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: campaignSlug },
    select: { id: true },
  });
  if (!campaign) {
    return { ok: false, error: "Campaign not found", status: 404 };
  }

  await db.$transaction(async (tx) => {
    await tx.angelProfile.update({
      where: { id: profile.id },
      data: {
        approvalStatus: "APPROVED",
        approvedAt: new Date(),
        approvedById: opts.adminUserId,
        rejectionReason: null,
      },
    });

    await tx.angelTrackEnrollment.upsert({
      where: { profileId_track: { profileId: profile.id, track: "ESCUTA" } },
      create: {
        id: randomId(),
        profileId: profile.id,
        track: "ESCUTA",
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById: opts.adminUserId,
      },
      update: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById: opts.adminUserId,
      },
    });

    await tx.humanitarianAngel.upsert({
      where: {
        campaignId_userId: { campaignId: campaign.id, userId: profile.userId },
      },
      create: {
        campaignId: campaign.id,
        userId: profile.userId,
        active: true,
      },
      update: { active: true },
    });
  });

  await notifyAngelUser(profile.userId, async (u) => {
    const name = `${u.firstName} ${u.lastName}`.trim() || "Voluntário";
    await sendAngelApprovedEmail({
      email: u.email,
      name,
      language: u.language ?? undefined,
    });
  });

  return { ok: true, status: "APPROVED" };
}

/** Reject angel and deactivate campaign enrollments. */
export async function rejectAngelVolunteer(opts: {
  profileId?: string;
  userId?: string;
  rejectionReason?: string | null;
}): Promise<AngelApprovalResult> {
  const profile = await db.angelProfile.findFirst({
    where: opts.profileId
      ? { id: opts.profileId }
      : opts.userId
        ? { userId: opts.userId }
        : { id: "__missing__" },
  });
  if (!profile) {
    return { ok: false, error: "Angel not found", status: 404 };
  }

  await db.$transaction(async (tx) => {
    await tx.angelProfile.update({
      where: { id: profile.id },
      data: {
        approvalStatus: "REJECTED",
        rejectionReason: opts.rejectionReason || null,
        approvedAt: null,
        approvedById: null,
      },
    });
    await tx.humanitarianAngel.updateMany({
      where: { userId: profile.userId },
      data: { active: false },
    });
  });

  await notifyAngelUser(profile.userId, async (u) => {
    const name = `${u.firstName} ${u.lastName}`.trim() || "Voluntário";
    await sendAngelRejectedEmail({
      email: u.email,
      name,
      rejectionReason: opts.rejectionReason ?? undefined,
      language: u.language ?? undefined,
    });
  });

  return { ok: true, status: "REJECTED" };
}
