// src/lib/notifications.ts
// Helper to create in-app notifications (the bell icon in the dashboard).
// Use this anywhere something happens that the user should be told about:
// new message, shared record, appointment reminder, payment, etc.

import { db } from "@/lib/db";
import { sendWebPushToUser } from "@/lib/web-push";

type NotificationType =
  | "message"
  | "shared_record"
  | "appointment_reminder"
  | "appointment_confirmed"
  | "payment"
  | "system"
  | "favorite_online"
  | "review_request";

export async function createNotification(params: {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        body: params.body,
        type: params.type,
        data: params.data ? (params.data as any) : undefined,
      },
    });

    const url =
      typeof params.data?.url === "string"
        ? params.data.url
        : params.type === "message"
          ? "/patient/messages"
          : params.type === "appointment_reminder" || params.type === "appointment_confirmed"
            ? "/patient/appointments"
            : "/patient";

    sendWebPushToUser(params.userId, {
      title: params.title,
      body: params.body,
      url,
      data: params.data,
    }).catch(() => {});
  } catch (e) {
    // Never let a notification failure break the main action.
    console.error("[NOTIFICATIONS] Failed to create notification:", e);
  }
}
