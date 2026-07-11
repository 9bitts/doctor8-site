// QStash publisher for email campaign batch processing

import { getAppUrl } from "@/lib/email-core";

const QSTASH_URL = process.env.QSTASH_URL || "https://qstash-us-east-1.upstash.io";
const QSTASH_TOKEN = process.env.QSTASH_TOKEN || "";

export function isCampaignQStashConfigured(): boolean {
  return Boolean(QSTASH_TOKEN);
}

/** Publish immediate batch job to QStash worker. */
export async function scheduleCampaignBatchNow(campaignId: string): Promise<boolean> {
  if (!QSTASH_TOKEN) return false;

  const endpoint = `${getAppUrl()}/api/campaigns/process-batch`;
  const res = await fetch(`${QSTASH_URL}/v2/publish/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${QSTASH_TOKEN}`,
      "Content-Type": "application/json",
      "Upstash-Retries": "2",
      "Upstash-Deduplication-Id": `campaign-batch:${campaignId}:${Date.now()}`,
    },
    body: JSON.stringify({ campaignId }),
  });

  if (!res.ok) {
    console.error("[QSTASH CAMPAIGN] Publish failed:", await res.text());
    return false;
  }
  return true;
}

/** Schedule batch after delay (min 60s per QStash). */
export async function scheduleCampaignBatchDelayed(
  campaignId: string,
  delaySeconds: number,
): Promise<boolean> {
  if (!QSTASH_TOKEN) return false;
  const delay = Math.max(60, delaySeconds);

  const endpoint = `${getAppUrl()}/api/campaigns/process-batch`;
  const res = await fetch(`${QSTASH_URL}/v2/publish/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${QSTASH_TOKEN}`,
      "Content-Type": "application/json",
      "Upstash-Delay": `${delay}s`,
      "Upstash-Retries": "2",
      "Upstash-Deduplication-Id": `campaign-batch-sched:${campaignId}:${delay}`,
    },
    body: JSON.stringify({ campaignId }),
  });

  if (!res.ok) {
    console.error("[QSTASH CAMPAIGN] Schedule failed:", await res.text());
    return false;
  }
  return true;
}
