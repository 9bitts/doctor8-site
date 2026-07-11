// src/lib/admin/email-campaigns.ts
import Papa from "papaparse";
import { db } from "@/lib/db";
import {
  emailShell,
  getAppUrl,
  sendTransactionalEmail,
  type EmailLang,
} from "@/lib/email-core";
import {
  scheduleCampaignBatchDelayed,
  scheduleCampaignBatchNow,
} from "@/lib/qstash-campaign";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CIRCUIT_BREAKER_MIN = 10;
const CIRCUIT_BREAKER_RATE = 0.3;
const BATCH_LOCK_STALE_MS = 15 * 60 * 1000;

export type CampaignRow = { name?: string; email: string };

export type CampaignStats = {
  total: number;
  pending: number;
  sent: number;
  sendFailed: number;
  registered: number;
  optedOut: number;
  bounced: number;
  complained: number;
  opened: number;
  clicked: number;
  conversionRate: number;
  byStatus: Record<string, number>;
};

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function pickField(row: Record<string, string>, keys: string[]): string | undefined {
  for (const [rawKey, value] of Object.entries(row)) {
    const norm = normalizeHeader(rawKey);
    if (keys.includes(norm) && value?.trim()) return value.trim();
  }
  return undefined;
}

export function parseCampaignCsv(text: string): {
  rows: CampaignRow[];
  invalid: number;
} {
  const parsed = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const rows: CampaignRow[] = [];
  let invalid = 0;

  for (const row of parsed.data) {
    const emailRaw = pickField(row, ["email", "e-mail", "e mail", "mail"]);
    if (!emailRaw) {
      invalid++;
      continue;
    }
    const email = emailRaw.toLowerCase().trim();
    if (!EMAIL_RE.test(email)) {
      invalid++;
      continue;
    }
    const name = pickField(row, ["nome", "name", "fullname", "nomecompleto"]);
    rows.push({ email, name });
  }

  return { rows, invalid };
}

export function renderCampaignBodyHtml(
  bodyHtml: string,
  opts: { name?: string | null; email: string; inviteToken: string },
): string {
  const displayName = opts.name?.trim() || opts.email;
  const inviteLink = `${getAppUrl()}/register/professional/signup?invite=${opts.inviteToken}`;
  const unsubscribeLink = `${getAppUrl()}/unsubscribe?token=${opts.inviteToken}`;

  let body = bodyHtml
    .replace(/\{\{nome\}\}/gi, displayName)
    .replace(/\{\{link\}\}/gi, inviteLink);

  body += `
    <p style="margin-top:24px;font-size:12px;color:#9ca3af;text-align:center;">
      <a href="${unsubscribeLink}" style="color:#9ca3af;">Cancelar inscrição nesta lista</a>
    </p>`;

  return body;
}

export function renderCampaignEmail(opts: {
  subject: string;
  bodyHtml: string;
  name?: string | null;
  email: string;
  inviteToken: string;
  lang?: EmailLang;
}): { subject: string; html: string } {
  const lang = opts.lang ?? "pt";
  const body = renderCampaignBodyHtml(opts.bodyHtml, {
    name: opts.name,
    email: opts.email,
    inviteToken: opts.inviteToken,
  });
  return {
    subject: opts.subject,
    html: emailShell(opts.subject, body, lang),
  };
}

export async function getCampaignStats(campaignId: string): Promise<CampaignStats> {
  const groups = await db.emailCampaignRecipient.groupBy({
    by: ["status"],
    where: { campaignId },
    _count: { _all: true },
  });

  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const g of groups) {
    byStatus[g.status] = g._count._all;
    total += g._count._all;
  }

  const pending = byStatus.PENDING ?? 0;
  const sent = byStatus.SENT ?? 0;
  const sendFailed = byStatus.SEND_FAILED ?? 0;
  const registered = byStatus.REGISTERED ?? 0;
  const optedOut = byStatus.OPTED_OUT ?? 0;
  const bounced = byStatus.BOUNCED ?? 0;
  const complained = byStatus.COMPLAINED ?? 0;
  const opened = byStatus.OPENED ?? 0;
  const clicked = byStatus.CLICKED ?? 0;
  const eligible = Math.max(total - optedOut, 0);
  const conversionRate = eligible > 0 ? Math.round((registered / eligible) * 1000) / 10 : 0;

  return {
    total,
    pending,
    sent,
    sendFailed,
    registered,
    optedOut,
    bounced,
    complained,
    opened,
    clicked,
    conversionRate,
    byStatus,
  };
}

export async function importCampaignRecipients(
  campaignId: string,
  rows: CampaignRow[],
): Promise<{
  imported: number;
  skippedExistingUser: number;
  skippedDuplicate: number;
  invalid: number;
}> {
  let imported = 0;
  let skippedExistingUser = 0;
  let skippedDuplicate = 0;
  const invalid = 0;

  const existingEmails = new Set(
    (
      await db.user.findMany({
        where: {
          email: { in: rows.map((r) => r.email.toLowerCase()) },
        },
        select: { email: true },
      })
    ).map((u) => u.email.toLowerCase()),
  );

  for (const row of rows) {
    const email = row.email.toLowerCase().trim();
    if (!EMAIL_RE.test(email)) continue;

    if (existingEmails.has(email)) {
      skippedExistingUser++;
      continue;
    }

    const existing = await db.emailCampaignRecipient.findUnique({
      where: { campaignId_email: { campaignId, email } },
      select: { id: true },
    });
    if (existing) {
      if (row.name?.trim()) {
        await db.emailCampaignRecipient.update({
          where: { id: existing.id },
          data: { name: row.name.trim() },
        });
      }
      skippedDuplicate++;
      continue;
    }

    await db.emailCampaignRecipient.create({
      data: {
        campaignId,
        email,
        name: row.name?.trim() || null,
      },
    });
    imported++;
  }

  return { imported, skippedExistingUser, skippedDuplicate, invalid };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isCampaignPaused(campaignId: string): Promise<boolean> {
  const c = await db.emailCampaign.findUnique({
    where: { id: campaignId },
    select: { status: true },
  });
  return c?.status === "PAUSED";
}

async function finalizeCampaignStatus(campaignId: string): Promise<void> {
  const campaign = await db.emailCampaign.findUnique({
    where: { id: campaignId },
    select: { status: true },
  });
  if (!campaign || campaign.status === "PAUSED") return;

  const remaining = await db.emailCampaignRecipient.count({
    where: {
      campaignId,
      status: { in: ["PENDING", "SEND_FAILED"] },
    },
  });

  await db.emailCampaign.update({
    where: { id: campaignId },
    data: {
      status: remaining === 0 ? "DONE" : "SENDING",
      batchLockAt: null,
    },
  });
}

/** Atomically claim batch lock — returns false if another batch is running. */
export async function claimCampaignBatchLock(campaignId: string): Promise<boolean> {
  const staleBefore = new Date(Date.now() - BATCH_LOCK_STALE_MS);
  const result = await db.emailCampaign.updateMany({
    where: {
      id: campaignId,
      status: { not: "PAUSED" },
      OR: [{ batchLockAt: null }, { batchLockAt: { lt: staleBefore } }],
    },
    data: { batchLockAt: new Date(), status: "SENDING", lastError: null, scheduledBatchAt: null },
  });
  return result.count > 0;
}

export async function isCampaignBatchLocked(campaignId: string): Promise<boolean> {
  const campaign = await db.emailCampaign.findUnique({
    where: { id: campaignId },
    select: { batchLockAt: true },
  });
  if (!campaign?.batchLockAt) return false;
  const staleBefore = new Date(Date.now() - BATCH_LOCK_STALE_MS);
  return campaign.batchLockAt >= staleBefore;
}

async function releaseCampaignBatchLock(campaignId: string): Promise<void> {
  await db.emailCampaign.update({
    where: { id: campaignId },
    data: { batchLockAt: null },
  });
}

export async function processCampaignBatch(campaignId: string): Promise<void> {
  const claimed = await claimCampaignBatchLock(campaignId);
  if (!claimed) {
    console.warn("[CAMPAIGN BATCH] Lock not acquired for", campaignId);
    return;
  }

  try {
    const campaign = await db.emailCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.status === "PAUSED") return;

    const recipients = await db.emailCampaignRecipient.findMany({
      where: {
        campaignId,
        status: { in: ["PENDING", "SEND_FAILED"] },
      },
      orderBy: { createdAt: "asc" },
      take: campaign.batchSize,
    });

    if (recipients.length === 0) {
      await db.emailCampaign.update({
        where: { id: campaignId },
        data: { status: "DONE", batchLockAt: null },
      });
      return;
    }

    const maxBatch = await db.emailCampaignRecipient.aggregate({
      where: { campaignId, batchNumber: { not: null } },
      _max: { batchNumber: true },
    });
    const batchNumber = (maxBatch._max.batchNumber ?? 0) + 1;

    let processed = 0;
    let failed = 0;
    let circuitTripped = false;

    for (const recipient of recipients) {
      if (await isCampaignPaused(campaignId)) break;

      processed++;
      try {
        const { subject, html } = renderCampaignEmail({
          subject: campaign.subject,
          bodyHtml: campaign.bodyHtml,
          name: recipient.name,
          email: recipient.email,
          inviteToken: recipient.token,
        });

        const sendResult = await sendTransactionalEmail({
          to: recipient.email,
          subject,
          html,
          tag: `campaign-${campaignId}`,
        });

        await db.emailCampaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
            batchNumber,
            errorMessage: null,
            resendEmailId: sendResult.id,
          },
        });
      } catch (err) {
        failed++;
        const message = err instanceof Error ? err.message : "Send failed";
        await db.emailCampaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "SEND_FAILED",
            errorMessage: message.slice(0, 500),
            batchNumber,
          },
        });
      }

      if (processed >= CIRCUIT_BREAKER_MIN && failed / processed > CIRCUIT_BREAKER_RATE) {
        const rate = Math.round((failed / processed) * 100);
        await db.emailCampaign.update({
          where: { id: campaignId },
          data: {
            status: "PAUSED",
            lastError: `Lote pausado automaticamente: taxa de falha de ${rate}% — verifique configuração do Resend antes de retomar.`,
            batchLockAt: null,
          },
        });
        circuitTripped = true;
        break;
      }

      await sleep(500 + Math.random() * 500);
    }

    if (!circuitTripped) {
      await finalizeCampaignStatus(campaignId);
    }
  } finally {
    await releaseCampaignBatchLock(campaignId).catch(() => {});
  }
}

export async function resumeCampaign(campaignId: string): Promise<{
  ok: boolean;
  newStatus?: string;
  error?: string;
}> {
  const campaign = await db.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { ok: false, error: "NOT_FOUND" };
  if (campaign.status !== "PAUSED") return { ok: false, error: "NOT_PAUSED" };

  const [sentCount, pendingCount] = await Promise.all([
    db.emailCampaignRecipient.count({
      where: { campaignId, status: "SENT" },
    }),
    db.emailCampaignRecipient.count({
      where: { campaignId, status: { in: ["PENDING", "SEND_FAILED"] } },
    }),
  ]);

  let newStatus: string;
  if (sentCount === 0) {
    newStatus = "DRAFT";
  } else if (pendingCount > 0) {
    newStatus = "SENDING";
  } else {
    newStatus = "DONE";
  }

  await db.emailCampaign.update({
    where: { id: campaignId },
    data: { status: newStatus, lastError: null, batchLockAt: null },
  });

  return { ok: true, newStatus };
}

export async function markCampaignRecipientRegistered(
  userId: string,
  inviteToken?: string | null,
): Promise<void> {
  if (!inviteToken?.trim()) return;
  try {
    await db.emailCampaignRecipient.updateMany({
      where: {
        token: inviteToken.trim(),
        status: { notIn: ["REGISTERED", "OPTED_OUT"] },
      },
      data: {
        status: "REGISTERED",
        userId,
        registeredAt: new Date(),
      },
    });
  } catch (err) {
    console.error("[CAMPAIGN INVITE REGISTER]", err);
  }
}

export async function sendCampaignTestEmail(opts: {
  campaignId: string;
  to: string;
}): Promise<void> {
  const campaign = await db.emailCampaign.findUnique({ where: { id: opts.campaignId } });
  if (!campaign) throw new Error("Campaign not found");

  const { subject, html } = renderCampaignEmail({
    subject: campaign.subject,
    bodyHtml: campaign.bodyHtml,
    name: "Teste",
    email: opts.to,
    inviteToken: "test-preview",
  });

  await sendTransactionalEmail({
    to: opts.to,
    subject: `[TESTE] ${subject}`,
    html,
    tag: `campaign-test-${opts.campaignId}`,
  });
}

export function unsubscribeConfirmationHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Descadastro — Doctor8</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px; }
    .card { max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 2px 16px rgba(0,0,0,.08); text-align: center; }
    h1 { font-size: 20px; color: #0f172a; margin: 0 0 12px; }
    p { color: #64748b; line-height: 1.6; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Doctor8</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

export async function duplicateCampaign(
  sourceId: string,
  createdBy: string,
): Promise<{ id: string }> {
  const source = await db.emailCampaign.findUnique({ where: { id: sourceId } });
  if (!source) throw new Error("NOT_FOUND");

  const copy = await db.emailCampaign.create({
    data: {
      name: `${source.name} (cópia)`,
      subject: source.subject,
      bodyHtml: source.bodyHtml,
      batchSize: source.batchSize,
      createdBy,
      status: "DRAFT",
    },
  });

  return { id: copy.id };
}

export function recipientsToCsv(
  rows: Array<{
    email: string;
    name: string | null;
    status: string;
    batchNumber: number | null;
    sentAt: Date | null;
    registeredAt: Date | null;
    errorMessage: string | null;
  }>,
): string {
  const header = "email,nome,status,lote,enviado_em,cadastrado_em,erro";
  const lines = rows.map((r) => {
    const esc = (v: string | null | undefined) => {
      const s = v ?? "";
      return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [
      esc(r.email),
      esc(r.name),
      esc(r.status),
      r.batchNumber ?? "",
      r.sentAt?.toISOString() ?? "",
      r.registeredAt?.toISOString() ?? "",
      esc(r.errorMessage),
    ].join(",");
  });
  return [header, ...lines].join("\n");
}

/** Prefer QStash worker; fallback to inline processing on this Node process. */
export async function queueOrProcessCampaignBatch(
  campaignId: string,
): Promise<"qstash" | "inline"> {
  const viaQStash = await scheduleCampaignBatchNow(campaignId);
  if (viaQStash) return "qstash";

  void processCampaignBatch(campaignId).catch((err) => {
    console.error("[CAMPAIGN BATCH inline]", err);
  });
  return "inline";
}

export async function scheduleCampaignBatch(
  campaignId: string,
  delayMinutes: number,
): Promise<{ ok: boolean; scheduledAt?: Date; error?: string }> {
  const campaign = await db.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { ok: false, error: "NOT_FOUND" };
  if (campaign.status === "PAUSED") return { ok: false, error: "PAUSED" };
  if (await isCampaignBatchLocked(campaignId)) {
    return { ok: false, error: "BATCH_IN_PROGRESS" };
  }

  const delaySeconds = Math.max(60, Math.floor(delayMinutes * 60));
  const scheduledAt = new Date(Date.now() + delaySeconds * 1000);

  const ok = await scheduleCampaignBatchDelayed(campaignId, delaySeconds);
  if (!ok) return { ok: false, error: "QSTASH_UNAVAILABLE" };

  await db.emailCampaign.update({
    where: { id: campaignId },
    data: { scheduledBatchAt: scheduledAt },
  });

  return { ok: true, scheduledAt };
}

export async function deleteCampaign(campaignId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const campaign = await db.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { ok: false, error: "NOT_FOUND" };

  if (campaign.status === "SENDING" && (await isCampaignBatchLocked(campaignId))) {
    return { ok: false, error: "BATCH_IN_PROGRESS" };
  }

  const sentCount = await db.emailCampaignRecipient.count({
    where: { campaignId, status: "SENT" },
  });

  if (sentCount > 0 && campaign.status !== "DRAFT") {
    return { ok: false, error: "HAS_SENT_RECIPIENTS" };
  }

  await db.emailCampaign.delete({ where: { id: campaignId } });
  return { ok: true };
}

export async function processCampaignUnsubscribe(token: string): Promise<{
  html: string;
  status: number;
}> {
  if (!token.trim()) {
    return {
      html: unsubscribeConfirmationHtml("Link inválido. Nenhuma alteração foi feita."),
      status: 400,
    };
  }

  const recipient = await db.emailCampaignRecipient.findUnique({
    where: { token: token.trim() },
    select: { id: true, status: true },
  });

  if (!recipient) {
    return {
      html: unsubscribeConfirmationHtml("Link inválido ou expirado. Nenhuma alteração foi feita."),
      status: 404,
    };
  }

  if (recipient.status !== "OPTED_OUT") {
    await db.emailCampaignRecipient.update({
      where: { id: recipient.id },
      data: { status: "OPTED_OUT" },
    });
  }

  return {
    html: unsubscribeConfirmationHtml(
      "Você foi removido desta lista de e-mails. Não receberá mais mensagens desta campanha.",
    ),
    status: 200,
  };
}
