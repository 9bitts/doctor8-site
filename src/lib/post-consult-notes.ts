// Post-consultation notes reminder for providers (QStash + cron fallback).

import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import { safeDecrypt } from "@/lib/sign-helpers";
import type { ProviderType } from "@prisma/client";

type ProviderTarget = {
  userId: string;
  providerType: ProviderType;
  appointmentsUrl: string;
};

function resolveProvider(appointment: {
  professionalId: string | null;
  psychoanalystId: string | null;
  integrativeTherapistId: string | null;
  professional?: { userId: string } | null;
  psychoanalyst?: { userId: string } | null;
  integrativeTherapist?: { userId: string } | null;
}): ProviderTarget | null {
  if (appointment.professionalId && appointment.professional) {
    return {
      userId: appointment.professional.userId,
      providerType: "HEALTH",
      appointmentsUrl: "/professional/appointments",
    };
  }
  if (appointment.psychoanalystId && appointment.psychoanalyst) {
    return {
      userId: appointment.psychoanalyst.userId,
      providerType: "PSYCHOANALYST",
      appointmentsUrl: "/psychoanalyst/appointments",
    };
  }
  if (appointment.integrativeTherapistId && appointment.integrativeTherapist) {
    return {
      userId: appointment.integrativeTherapist.userId,
      providerType: "INTEGRATIVE_THERAPIST",
      appointmentsUrl: "/integrative-therapist/appointments",
    };
  }
  return null;
}

function notesDeepLink(provider: ProviderTarget, appointmentId: string): string {
  const base = `${provider.appointmentsUrl}#appt-${appointmentId}`;
  if (provider.providerType === "HEALTH") {
    return `/professional/appointments#appt-${appointmentId}`;
  }
  return base;
}

function appointmentEnded(appointment: { scheduledAt: Date; durationMins: number }): boolean {
  const endMs =
    appointment.scheduledAt.getTime() + appointment.durationMins * 60 * 1000;
  return Date.now() >= endMs + 15 * 60 * 1000;
}

export async function processPostConsultNotesReminder(
  appointmentId: string,
): Promise<"sent" | "skipped" | "failed"> {
  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      professional: {
        select: { id: true, userId: true, firstName: true, lastName: true },
      },
      psychoanalyst: {
        select: { id: true, userId: true, firstName: true, lastName: true },
      },
      integrativeTherapist: {
        select: { id: true, userId: true, firstName: true, lastName: true },
      },
    },
  });

  if (!appointment) return "skipped";
  if (appointment.notes) return "skipped";
  if (!["CONFIRMED", "COMPLETED"].includes(appointment.status)) return "skipped";
  if (!appointmentEnded(appointment)) return "skipped";

  const alreadySent = await db.qStashJobLog.findFirst({
    where: {
      appointmentId,
      jobType: "post_consult_notes",
      status: "sent",
    },
  });
  if (alreadySent) return "skipped";

  const provider = resolveProvider(appointment);
  if (!provider) return "skipped";

  const endMs =
    appointment.scheduledAt.getTime() + appointment.durationMins * 60 * 1000;
  if (appointment.status === "CONFIRMED" && Date.now() > endMs) {
    await db.appointment.update({
      where: { id: appointmentId },
      data: { status: "COMPLETED" },
    });
  }

  const patientName =
    `${safeDecrypt(appointment.patient.firstName)} ${safeDecrypt(appointment.patient.lastName)}`.trim() ||
    "Paciente";

  const copy = storedNotificationText(
    "notif.postConsultNotes.title",
    "notif.postConsultNotes.body",
    { patient: patientName },
  );

  try {
    await createNotification({
      userId: provider.userId,
      title: copy.title,
      body: copy.body,
      type: "system",
      data: {
        kind: "post_consult_notes",
        appointmentId,
        url: notesDeepLink(provider, appointmentId),
        link: notesDeepLink(provider, appointmentId),
        titleKey: "notif.postConsultNotes.title",
        bodyKey: "notif.postConsultNotes.body",
        bodyParams: { patient: patientName },
      },
    });
  } catch (e) {
    console.error("[POST-CONSULT-NOTES] notification failed:", e);
    return "failed";
  }

  return "sent";
}

/** Cron fallback: appointments that ended without notes in the last 72h. */
export async function findPostConsultNotesCandidates(limit = 100): Promise<string[]> {
  const since = new Date(Date.now() - 72 * 60 * 60 * 1000);
  const rows = await db.appointment.findMany({
    where: {
      status: { in: ["CONFIRMED", "COMPLETED"] },
      notes: null,
      scheduledAt: { gte: since },
      OR: [
        { professionalId: { not: null } },
        { psychoanalystId: { not: null } },
        { integrativeTherapistId: { not: null } },
      ],
    },
    select: { id: true, scheduledAt: true, durationMins: true },
    orderBy: { scheduledAt: "desc" },
    take: limit * 3,
  });

  const ids: string[] = [];
  for (const row of rows) {
    if (!appointmentEnded(row)) continue;
    const sent = await db.qStashJobLog.findFirst({
      where: {
        appointmentId: row.id,
        jobType: "post_consult_notes",
        status: "sent",
      },
      select: { id: true },
    });
    if (!sent) ids.push(row.id);
    if (ids.length >= limit) break;
  }
  return ids;
}
