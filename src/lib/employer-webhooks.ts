import { createHmac, randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
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

      let httpStatus: number | null = null;
      let success = false;
      let errorMessage: string | null = null;

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
        httpStatus = res.status;
        success = res.ok;
        if (!res.ok) {
          errorMessage = `HTTP ${res.status}`;
          console.error(`[EMPLOYER-WEBHOOK] ${ep.id} HTTP ${res.status}`);
        }
      } catch (e) {
        errorMessage = e instanceof Error ? e.message : "Delivery failed";
        console.error(`[EMPLOYER-WEBHOOK] ${ep.id} failed:`, e);
      }

      try {
        await db.employerWebhookDelivery.create({
          data: {
            endpointId: ep.id,
            employerCompanyId,
            event,
            payloadJson: payload as Prisma.InputJsonValue,
            httpStatus,
            success,
            errorMessage,
          },
        });
      } catch (logErr) {
        console.error("[EMPLOYER-WEBHOOK] log failed:", logErr);
      }
    }),
  );
}
