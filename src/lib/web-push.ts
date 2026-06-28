import webpush from "web-push";
import { db } from "@/lib/db";

function has(v: string | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function isWebPushEnabled(): boolean {
  return has(process.env.VAPID_PUBLIC_KEY) && has(process.env.VAPID_PRIVATE_KEY);
}

export function getVapidPublicKey(): string | null {
  const key =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
    process.env.VAPID_PUBLIC_KEY?.trim();
  return key || null;
}

function configureVapid(): boolean {
  if (!isWebPushEnabled()) return false;
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:support@doctor8.org";
  webpush.setVapidDetails(
    subject,
    process.env.VAPID_PUBLIC_KEY!.trim(),
    process.env.VAPID_PRIVATE_KEY!.trim(),
  );
  return true;
}

export async function sendWebPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string; data?: Record<string, unknown> },
): Promise<void> {
  if (!configureVapid()) return;

  const subs = await db.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    data: { url: payload.url || "/patient", ...(payload.data || {}) },
  });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          message,
        );
      } catch (e: unknown) {
        const status = (e as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error("[WEBPUSH] send failed:", e);
        }
      }
    }),
  );
}
