import { createHmac, randomBytes } from "crypto";
import { db } from "@/lib/db";

export const EMPLOYER_WEBHOOK_EVENTS = [
  "whistleblower.created",
  "compliance.updated",
  "workforce.member.added",
] as const;

export type EmployerWebhookEvent = (typeof EMPLOYER_WEBHOOK_EVENTS)[number];

export function generateWebhookSecret(): string {
  return randomBytes(24).toString("hex");
}

function signPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export async function dispatchEmployerWebhooks(
  employerCompanyId: string,
  event: EmployerWebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  const endpoints = await db.employerWebhookEndpoint.findMany({
    where: { employerCompanyId, enabled: true },
  });

  const body = JSON.stringify({
    event,
    sentAt: new Date().toISOString(),
    data: payload,
  });

  await Promise.all(
    endpoints.map(async (ep) => {
      const events = Array.isArray(ep.events) ? ep.events : [];
      if (events.length > 0 && !events.includes(event)) return;

      try {
        const signature = signPayload(ep.secret, body);
        const res = await fetch(ep.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Doctor8-Event": event,
            "X-Doctor8-Signature": signature,
          },
          body,
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) {
          console.error(`[EMPLOYER-WEBHOOK] ${ep.id} HTTP ${res.status}`);
        }
      } catch (e) {
        console.error(`[EMPLOYER-WEBHOOK] ${ep.id} failed:`, e);
      }
    }),
  );
}
