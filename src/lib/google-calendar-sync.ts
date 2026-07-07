// Push Doctor8 appointments to Google Calendar + pull external busy blocks.

import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import {
  encryptToken,
  getAuthorizedCalendarClient,
  isGoogleCalendarOAuthConfigured,
} from "@/lib/google-calendar-oauth";
import { isPsychologyGoogleCalendarEnabled } from "@/lib/psychology-feature-flags";

export type ExternalBusyBlock = { start: string; end: string; summary?: string };

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function syncAppointmentToGoogleCalendar(appointmentId: string): Promise<void> {
  if (!isGoogleCalendarOAuthConfigured() || !isPsychologyGoogleCalendarEnabled()) return;

  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      professional: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          specialty: true,
          googleCalendar: true,
        },
      },
    },
  });

  if (!appointment?.professionalId || !appointment.professional?.googleCalendar?.syncEnabled) return;
  if (!["CONFIRMED", "PENDING"].includes(appointment.status)) {
    if (appointment.googleCalendarEventId) {
      await deleteGoogleCalendarEvent(appointment.professionalId, appointment.googleCalendarEventId);
      await db.appointment.update({
        where: { id: appointmentId },
        data: { googleCalendarEventId: null },
      });
    }
    return;
  }

  const conn = appointment.professional.googleCalendar;
  const { calendar, client } = await getAuthorizedCalendarClient(conn.refreshToken, conn.accessToken);

  const patientName = `${safeDecrypt(appointment.patient.firstName)} ${safeDecrypt(appointment.patient.lastName)}`.trim();
  const proName = `${appointment.professional.firstName} ${appointment.professional.lastName}`;
  const start = new Date(appointment.scheduledAt);
  const end = new Date(start.getTime() + (appointment.durationMins || 30) * 60_000);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://doctor8.app";

  const eventBody = {
    summary: `Consulta — ${patientName}`,
    description: `${appointment.professional.specialty}\nDoctor8: ${appUrl}/psychologist/appointments`,
    start: { dateTime: start.toISOString(), timeZone: "UTC" },
    end: { dateTime: end.toISOString(), timeZone: "UTC" },
    extendedProperties: {
      private: { doctor8AppointmentId: appointment.id, doctor8Source: "1" },
    },
  };

  try {
    if (appointment.googleCalendarEventId) {
      await calendar.events.update({
        calendarId: conn.calendarId,
        eventId: appointment.googleCalendarEventId,
        requestBody: eventBody,
      });
    } else {
      const res = await calendar.events.insert({
        calendarId: conn.calendarId,
        requestBody: eventBody,
      });
      if (res.data.id) {
        await db.appointment.update({
          where: { id: appointmentId },
          data: { googleCalendarEventId: res.data.id },
        });
      }
    }

    const creds = client.credentials;
    if (creds.access_token) {
      await db.professionalGoogleCalendar.update({
        where: { professionalId: appointment.professionalId },
        data: {
          accessToken: encryptToken(creds.access_token),
          tokenExpiresAt: creds.expiry_date ? new Date(creds.expiry_date) : null,
        },
      });
    }
  } catch (e) {
    console.error("[GCAL-SYNC] push failed:", e);
  }
}

export async function deleteGoogleCalendarEvent(
  professionalId: string,
  eventId: string,
): Promise<void> {
  const conn = await db.professionalGoogleCalendar.findUnique({
    where: { professionalId },
  });
  if (!conn) return;

  try {
    const { calendar } = await getAuthorizedCalendarClient(conn.refreshToken, conn.accessToken);
    await calendar.events.delete({ calendarId: conn.calendarId, eventId });
  } catch (e) {
    console.error("[GCAL-SYNC] delete failed:", e);
  }
}

export async function pullGoogleCalendarBusyBlocks(professionalId: string): Promise<ExternalBusyBlock[]> {
  const conn = await db.professionalGoogleCalendar.findUnique({
    where: { professionalId },
  });
  if (!conn?.syncEnabled) return [];

  const { calendar, client } = await getAuthorizedCalendarClient(conn.refreshToken, conn.accessToken);
  const now = new Date();
  const horizon = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const res = await calendar.events.list({
    calendarId: conn.calendarId,
    timeMin: now.toISOString(),
    timeMax: horizon.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 250,
  });

  const blocks: ExternalBusyBlock[] = [];
  for (const ev of res.data.items || []) {
    if (ev.extendedProperties?.private?.doctor8Source === "1") continue;
    const start = ev.start?.dateTime || ev.start?.date;
    const end = ev.end?.dateTime || ev.end?.date;
    if (!start || !end) continue;
    blocks.push({
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      summary: ev.summary || undefined,
    });
  }

  await db.professionalGoogleCalendar.update({
    where: { professionalId },
    data: {
      externalBusyBlocks: blocks,
      lastSyncedAt: new Date(),
      accessToken: client.credentials.access_token
        ? encryptToken(client.credentials.access_token)
        : conn.accessToken,
      tokenExpiresAt: client.credentials.expiry_date
        ? new Date(client.credentials.expiry_date)
        : conn.tokenExpiresAt,
    },
  });

  return blocks;
}

export async function syncProfessionalGoogleCalendar(professionalId: string): Promise<{
  pushed: number;
  externalBlocks: number;
}> {
  const appointments = await db.appointment.findMany({
    where: {
      professionalId,
      status: { in: ["CONFIRMED", "PENDING"] },
      scheduledAt: { gte: new Date() },
    },
    select: { id: true },
    take: 100,
  });

  for (const a of appointments) {
    await syncAppointmentToGoogleCalendar(a.id);
  }

  const blocks = await pullGoogleCalendarBusyBlocks(professionalId);
  return { pushed: appointments.length, externalBlocks: blocks.length };
}

export function slotOverlapsExternalBlock(
  slotIso: string,
  durationMins: number,
  blocks: ExternalBusyBlock[] | null | undefined,
): boolean {
  if (!blocks?.length) return false;
  const slotStart = new Date(slotIso).getTime();
  const slotEnd = slotStart + durationMins * 60_000;
  return blocks.some((b) => {
    const bStart = new Date(b.start).getTime();
    const bEnd = new Date(b.end).getTime();
    return slotStart < bEnd && slotEnd > bStart;
  });
}
