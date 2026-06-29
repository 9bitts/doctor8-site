// Validates active teleconsult context for session keepalive.

import { db } from "@/lib/db";
import { isVolunteerOnEntry } from "@/lib/humanitarian/volunteer-eligibility";
import { appointmentJoinWindow } from "@/lib/appointment-join-window";

export type ConsultKind = "appointment" | "jit" | "humanitarian";

export async function verifyActiveConsult(
  userId: string,
  kind: ConsultKind,
  id: string,
): Promise<boolean> {
  if (kind === "appointment") {
    const appointment = await db.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { userId: true } },
        professional: { select: { userId: true } },
        psychoanalyst: { select: { userId: true } },
        integrativeTherapist: { select: { userId: true } },
      },
    });
    if (!appointment || appointment.status === "CANCELLED") return false;
    if (appointment.status !== "CONFIRMED") return false;
    if (appointment.type !== "TELECONSULT") return false;

    const providerUserId =
      appointment.professional?.userId ??
      appointment.psychoanalyst?.userId ??
      appointment.integrativeTherapist?.userId;
    const isParticipant =
      appointment.patient.userId === userId || providerUserId === userId;
    if (!isParticipant) return false;

    const duration = appointment.durationMins || 30;
    const { joinOpensAt, joinClosesAt, now } = appointmentJoinWindow(
      appointment.scheduledAt,
      duration,
    );
    return now >= joinOpensAt && now <= joinClosesAt;
  }

  if (kind === "jit") {
    const entry = await db.jitQueue.findUnique({
      where: { id },
      include: {
        session: {
          include: {
            professional: { select: { userId: true } },
          },
        },
      },
    });
    if (!entry) return false;
    if (!["CALLED", "IN_PROGRESS"].includes(entry.status)) return false;

    const isPatient = entry.patientUserId === userId;
    const isProfessional = entry.session.professional.userId === userId;
    return isPatient || isProfessional;
  }

  if (kind === "humanitarian") {
    const entry = await db.humanitarianQueueEntry.findUnique({
      where: { id },
      include: {
        volunteer: {
          include: {
            professional: { select: { userId: true } },
            psychoanalyst: { select: { userId: true } },
            integrativeTherapist: { select: { userId: true } },
          },
        },
      },
    });
    if (!entry) return false;
    if (!["CALLED", "IN_PROGRESS"].includes(entry.status)) return false;

    const isPatient = entry.patientUserId === userId;
    const isVolunteer = isVolunteerOnEntry(entry.volunteer, userId);
    return isPatient || isVolunteer;
  }

  return false;
}
