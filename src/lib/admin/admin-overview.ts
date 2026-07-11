import { db } from "@/lib/db";
import { listAdminProviders } from "@/lib/admin-providers-list";

export type AdminOverviewStats = {
  pendingProviders: number;
  incompleteSignups: number;
  pendingAngels: number;
  lockedAccounts: number;
  unverifiedUsers: number;
  occupationalPhysicians: number;
  humanitarianWaiting: number | null;
  emailCampaignsAttention: number;
  emailCampaignsPendingRecipients: number;
};

export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
  const now = new Date();

  const [
    providersPayload,
    lockedAccounts,
    unverifiedUsers,
    occupationalPhysicians,
    pendingAngels,
    humanitarianWaiting,
    emailCampaignsAttention,
    emailCampaignsPendingRecipients,
  ] = await Promise.all([
    listAdminProviders("pendentes"),
    db.user.count({
      where: {
        deletedAt: null,
        lockedUntil: { gt: now },
      },
    }),
    db.user.count({
      where: {
        deletedAt: null,
        emailVerified: null,
        phoneVerified: null,
      },
    }),
    db.user.count({
      where: {
        deletedAt: null,
        role: "OCCUPATIONAL_PHYSICIAN",
      },
    }),
    db.angelProfile.count({
      where: {
        approvalStatus: "PENDING",
        user: { deletedAt: null },
      },
    }),
    db.humanitarianQueueEntry
      .count({ where: { status: "WAITING" } })
      .catch(() => null),
    db.emailCampaign.count({
      where: { status: { in: ["SENDING", "PAUSED"] } },
    }).catch(() => 0),
    db.emailCampaignRecipient.count({
      where: {
        status: { in: ["PENDING", "SEND_FAILED"] },
        campaign: { status: { not: "DONE" } },
      },
    }).catch(() => 0),
  ]);

  const incompletePayload = await listAdminProviders("incompletos");

  return {
    pendingProviders: providersPayload.pendingCounts.pendentes ?? 0,
    incompleteSignups: incompletePayload.incompleteSignups.length,
    pendingAngels,
    lockedAccounts,
    unverifiedUsers,
    occupationalPhysicians,
    humanitarianWaiting,
    emailCampaignsAttention,
    emailCampaignsPendingRecipients,
  };
}
