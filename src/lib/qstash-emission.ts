import { Receiver } from "@upstash/qstash";
import type { EmissionDeliverKind } from "@/lib/emission-deliver";

const QSTASH_URL = process.env.QSTASH_URL || "https://qstash-us-east-1.upstash.io";
const QSTASH_TOKEN = process.env.QSTASH_TOKEN || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.doctor8.org";

export { Receiver as QStashReceiver };

export async function scheduleEmissionDelivery(opts: {
  professionalUserId: string;
  kind: EmissionDeliverKind;
  id: string;
  sendWhatsApp?: boolean;
}): Promise<boolean> {
  if (!QSTASH_TOKEN) {
    console.warn("[QSTASH] No token — emission delivery will run synchronously");
    return false;
  }

  const endpoint = `${APP_URL}/api/emissions/deliver`;
  const dedupeId = `emission:${opts.kind}:${opts.id}`;

  const res = await fetch(`${QSTASH_URL}/v2/publish/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${QSTASH_TOKEN}`,
      "Content-Type": "application/json",
      "Upstash-Retries": "5",
      "Upstash-Deduplication-Id": dedupeId,
    },
    body: JSON.stringify(opts),
  });

  if (!res.ok) {
    console.error("[QSTASH] Emission delivery schedule failed:", await res.text());
    return false;
  }
  return true;
}
