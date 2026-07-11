// Resend webhook event handling for email campaigns

import { db } from "@/lib/db";

type ResendWebhookPayload = {
  type: string;
  data?: {
    email_id?: string;
    to?: string[];
    tags?: { category?: string };
    bounce?: { message?: string; type?: string };
  };
};

const TERMINAL_STATUSES = new Set(["REGISTERED", "OPTED_OUT"]);

function parseCampaignIdFromTag(tag: string | undefined): string | null {
  if (!tag) return null;
  const m = tag.match(/^campaign-(?!test-)([a-z0-9]+)$/i);
  return m?.[1] ?? null;
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

async function findRecipient(opts: {
  campaignId: string;
  email: string;
  resendEmailId?: string | null;
}) {
  if (opts.resendEmailId) {
    const byResend = await db.emailCampaignRecipient.findFirst({
      where: { resendEmailId: opts.resendEmailId, campaignId: opts.campaignId },
    });
    if (byResend) return byResend;
  }
  return db.emailCampaignRecipient.findUnique({
    where: {
      campaignId_email: {
        campaignId: opts.campaignId,
        email: opts.email,
      },
    },
  });
}

export async function handleResendCampaignWebhook(
  payload: ResendWebhookPayload,
): Promise<{ handled: boolean; reason?: string }> {
  const tag = payload.data?.tags?.category;
  const campaignId = parseCampaignIdFromTag(tag);
  if (!campaignId) {
    return { handled: false, reason: "not_campaign" };
  }

  const toRaw = payload.data?.to?.[0];
  if (!toRaw) return { handled: false, reason: "no_recipient" };

  const email = normalizeEmail(toRaw);
  const recipient = await findRecipient({
    campaignId,
    email,
    resendEmailId: payload.data?.email_id,
  });

  if (!recipient) return { handled: false, reason: "recipient_not_found" };
  if (TERMINAL_STATUSES.has(recipient.status)) {
    return { handled: true, reason: "terminal_status" };
  }

  const type = payload.type;

  if (type === "email.bounced") {
    const bounceMsg = payload.data?.bounce?.message?.slice(0, 500) ?? "Bounced";
    await db.emailCampaignRecipient.update({
      where: { id: recipient.id },
      data: { status: "BOUNCED", errorMessage: bounceMsg },
    });
    return { handled: true };
  }

  if (type === "email.complained") {
    await db.emailCampaignRecipient.update({
      where: { id: recipient.id },
      data: { status: "COMPLAINED", errorMessage: "Marked as spam" },
    });
    return { handled: true };
  }

  if (type === "email.opened") {
    if (recipient.status === "SENT" || recipient.status === "OPENED") {
      await db.emailCampaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "OPENED" },
      });
    }
    return { handled: true };
  }

  if (type === "email.clicked") {
    if (["SENT", "OPENED", "CLICKED"].includes(recipient.status)) {
      await db.emailCampaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "CLICKED" },
      });
    }
    return { handled: true };
  }

  return { handled: false, reason: "event_ignored" };
}
