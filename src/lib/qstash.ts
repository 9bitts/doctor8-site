// src/lib/qstash.ts
// QStash client for scheduling appointment reminders
// Uses Upstash QStash to schedule delayed HTTP calls

import { Receiver } from "@upstash/qstash";
import { db } from "@/lib/db";

const QSTASH_URL = process.env.QSTASH_URL || "https://qstash-us-east-1.upstash.io";
const QSTASH_TOKEN = process.env.QSTASH_TOKEN || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.doctor8.org";

interface ScheduleReminderParams {
  appointmentId: string;
  type: "24h_email" | "3h_whatsapp" | "3h_email" | "bell" | "review_request";
  delaySeconds: number;
  remindersEpoch: number;
}

// Schedule a single reminder via QStash
export async function scheduleReminder({
  appointmentId,
  type,
  delaySeconds,
  remindersEpoch,
}: ScheduleReminderParams): Promise<void> {
  if (!QSTASH_TOKEN) {
    console.warn("[QSTASH] No token set — skipping reminder schedule");
    return;
  }

  const endpoint = `${APP_URL}/api/reminders/send`;

  const res = await fetch(`${QSTASH_URL}/v2/publish/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${QSTASH_TOKEN}`,
      "Content-Type": "application/json",
      "Upstash-Delay": `${delaySeconds}s`,
      "Upstash-Retries": "3",
      "Upstash-Deduplication-Id": `${appointmentId}:${type}:${remindersEpoch}`,
    },
    body: JSON.stringify({ appointmentId, type, remindersEpoch }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[QSTASH] Failed to schedule ${type} reminder:`, err);
  } else {
    console.log(`[QSTASH] Scheduled ${type} reminder for appointment ${appointmentId} in ${delaySeconds}s`);
  }
}

// Schedule all reminders for an appointment
// Called right after appointment is confirmed
export async function scheduleAppointmentReminders(
  appointmentId: string,
  scheduledAt: Date,
): Promise<void> {
  const appt = await db.appointment.findUnique({
    where: { id: appointmentId },
    select: { remindersEpoch: true },
  });
  const remindersEpoch = appt?.remindersEpoch ?? 0;

  const now = Date.now();
  const apptTime = scheduledAt.getTime();

  // 24h email reminder
  const delay24h = Math.floor((apptTime - 24 * 60 * 60 * 1000 - now) / 1000);
  // 3h WhatsApp + email reminder
  const delay3h = Math.floor((apptTime - 3 * 60 * 60 * 1000 - now) / 1000);

  // Only schedule if the delay is positive (appointment is in the future)
  const promises: Promise<void>[] = [];

  if (delay24h > 60) {
    promises.push(scheduleReminder({ appointmentId, type: "24h_email", delaySeconds: delay24h, remindersEpoch }));
    promises.push(scheduleReminder({ appointmentId, type: "bell", delaySeconds: delay24h, remindersEpoch }));
  }

  if (delay3h > 60) {
    promises.push(scheduleReminder({ appointmentId, type: "3h_email", delaySeconds: delay3h, remindersEpoch }));
    promises.push(scheduleReminder({ appointmentId, type: "3h_whatsapp", delaySeconds: delay3h, remindersEpoch }));
  }

  await Promise.allSettled(promises);
}

/** Schedule review request email ~2h after appointment ends. */
export async function scheduleReviewRequest(
  appointmentId: string,
  scheduledAt: Date,
  durationMins: number
): Promise<void> {
  const endTime = scheduledAt.getTime() + durationMins * 60 * 1000;
  const delaySeconds = Math.floor((endTime + 2 * 60 * 60 * 1000 - Date.now()) / 1000);
  if (delaySeconds < 60) return;

  await scheduleReminder({
    appointmentId,
    type: "review_request",
    delaySeconds,
    remindersEpoch: (await db.appointment.findUnique({
      where: { id: appointmentId },
      select: { remindersEpoch: true },
    }))?.remindersEpoch ?? 0,
  });
}

let qstashReceiver: Receiver | null = null;

function getQStashReceiver(): Receiver | null {
  const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY || "";
  const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY || "";
  if (!currentKey) return null;

  if (!qstashReceiver) {
    qstashReceiver = new Receiver({
      currentSigningKey: currentKey,
      nextSigningKey: nextKey,
    });
  }
  return qstashReceiver;
}

// Verify QStash signature — ensures request came from QStash
export async function verifyQStashSignature(
  req: Request,
  rawBody: string,
): Promise<boolean> {
  const receiver = getQStashReceiver();
  if (!receiver) {
    console.error("[QSTASH] Missing QSTASH_CURRENT_SIGNING_KEY — rejecting unsigned request");
    return false;
  }

  const signature = req.headers.get("upstash-signature");
  if (!signature) return false;

  try {
    return await receiver.verify({
      signature,
      body: rawBody,
    });
  } catch {
    return false;
  }
}
