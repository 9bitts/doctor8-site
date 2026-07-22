// Resolve whether a video "returnUrl" still points at a live consult for the viewer.

import { db } from "@/lib/db";
import { isWithinAppointmentJoinWindow } from "@/lib/appointment-join-window";
import { expireStaleJitInProgress, markJitQueuesDone } from "@/lib/jit-queue-completion";

export type VideoReturnTarget =
  | { kind: "jit"; queueId: string }
  | { kind: "humanitarian"; entryId: string }
  | { kind: "appointment"; appointmentId: string };

/** Parse in-app video paths like `/video/jit/abc` (ignores origin if absolute). */
export function parseVideoReturnPath(returnUrl: string): VideoReturnTarget | null {
  let path = returnUrl.trim();
  try {
    if (/^https?:\/\//i.test(path)) {
      path = new URL(path).pathname;
    }
  } catch {
    return null;
  }
  path = path.split("?")[0].split("#")[0];

  const jit = path.match(/^\/video\/jit\/([^/]+)\/?$/);
  if (jit) return { kind: "jit", queueId: decodeURIComponent(jit[1]) };

  const hum = path.match(/^\/video\/humanitarian\/([^/]+)\/?$/);
  if (hum) return { kind: "humanitarian", entryId: decodeURIComponent(hum[1]) };

  const appt = path.match(/^\/video\/([^/]+)\/?$/);
  if (appt && appt[1] !== "jit" && appt[1] !== "humanitarian") {
    return { kind: "appointment", appointmentId: decodeURIComponent(appt[1]) };
  }

  return null;
}

export async function isVideoReturnActiveForUser(
  returnUrl: string,
  userId: string,
): Promise<boolean> {
  const target = parseVideoReturnPath(returnUrl);
  if (!target) return false;

  if (target.kind === "jit") {
    await expireStaleJitInProgress();

    const entry = await db.jitQueue.findUnique({
      where: { id: target.queueId },
      select: {
        id: true,
        status: true,
        patientUserId: true,
        session: {
          select: {
            status: true,
            professional: { select: { userId: true } },
          },
        },
      },
    });
    if (!entry) return false;

    const isPatient = entry.patientUserId === userId;
    const isPro = entry.session.professional.userId === userId;
    if (!isPatient && !isPro) return false;

    if (entry.session.status === "OFFLINE" && entry.status === "IN_PROGRESS") {
      await markJitQueuesDone({ id: entry.id });
      return false;
    }

    return ["CALLED", "IN_PROGRESS"].includes(entry.status);
  }

  if (target.kind === "humanitarian") {
    const entry = await db.humanitarianQueueEntry.findUnique({
      where: { id: target.entryId },
      select: {
        id: true,
        status: true,
        patientUserId: true,
        volunteer: { select: { userId: true } },
      },
    });
    if (!entry) return false;
    const isPatient = entry.patientUserId === userId;
    const isVolunteer = entry.volunteer?.userId === userId;
    if (!isPatient && !isVolunteer) return false;
    return ["CALLED", "IN_PROGRESS"].includes(entry.status);
  }

  const appointment = await db.appointment.findUnique({
    where: { id: target.appointmentId },
    select: {
      id: true,
      status: true,
      type: true,
      scheduledAt: true,
      durationMins: true,
      patient: { select: { userId: true } },
      professional: { select: { userId: true } },
      psychoanalyst: { select: { userId: true } },
      integrativeTherapist: { select: { userId: true } },
    },
  });
  if (!appointment) return false;

  const providerUserId =
    appointment.professional?.userId
    ?? appointment.psychoanalyst?.userId
    ?? appointment.integrativeTherapist?.userId;
  const isPatient = appointment.patient.userId === userId;
  const isProvider = providerUserId === userId;
  if (!isPatient && !isProvider) return false;
  if (appointment.status === "CANCELLED" || appointment.status === "COMPLETED") return false;
  if (appointment.status !== "CONFIRMED") return false;
  if (appointment.type !== "TELECONSULT") return false;

  return isWithinAppointmentJoinWindow(appointment.scheduledAt, appointment.durationMins || 30);
}
