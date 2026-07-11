import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import { localeOf } from "@/lib/i18n/translations";
import { safeDecrypt } from "@/lib/psychoanalyst-api";
import { notifySlotAlerts } from "@/lib/slot-alerts";
import { sendAppointmentCancelled } from "@/lib/email";
import {
  isRemovedFromVolunteerSchedule,
  type VolunteerWeeklyBlock,
} from "@/lib/availability-exceptions";
import { SCHEDULED_VOLUNTEER_BOOKING_SOURCE } from "@/lib/scheduled-volunteer";
import {
  formatAppointmentTimeWithLabel,
  formatShortDateWithYear,
} from "@/lib/timezone";

export type VolunteerBlockConflict = {
  appointmentId: string;
  scheduledAt: string;
  dateLabel: string;
  timeLabel: string;
  patientFirstName: string;
};

export async function findVolunteerBlockConflicts(
  professionalId: string,
  timeZone: string,
  oldBlocks: VolunteerWeeklyBlock[],
  newBlocks: VolunteerWeeklyBlock[],
  locale = localeOf("pt"),
): Promise<VolunteerBlockConflict[]> {
  const futureAppointments = await db.appointment.findMany({
    where: {
      professionalId,
      bookingSource: SCHEDULED_VOLUNTEER_BOOKING_SOURCE,
      status: { in: ["CONFIRMED", "PENDING"] },
      scheduledAt: { gte: new Date() },
    },
    select: {
      id: true,
      scheduledAt: true,
      patient: { select: { firstName: true } },
    },
  });

  return futureAppointments
    .filter((apt) =>
      isRemovedFromVolunteerSchedule(apt.scheduledAt, timeZone, oldBlocks, newBlocks),
    )
    .map((apt) => ({
      appointmentId: apt.id,
      scheduledAt: apt.scheduledAt.toISOString(),
      dateLabel: formatShortDateWithYear(apt.scheduledAt, timeZone, locale),
      timeLabel: formatAppointmentTimeWithLabel(apt.scheduledAt, timeZone, locale),
      patientFirstName: safeDecrypt(apt.patient.firstName).split(/\s+/)[0] || "Paciente",
    }));
}

export async function cancelVolunteerBlockConflicts(
  professionalId: string,
  cancelledByUserId: string,
  appointmentIds: string[],
  reason = "Professional removed volunteer availability block",
): Promise<void> {
  if (appointmentIds.length === 0) return;

  const appointments = await db.appointment.findMany({
    where: {
      id: { in: appointmentIds },
      professionalId,
      bookingSource: SCHEDULED_VOLUNTEER_BOOKING_SOURCE,
      status: { in: ["CONFIRMED", "PENDING"] },
    },
    include: {
      patient: { select: { userId: true, firstName: true, lastName: true } },
      professional: { select: { firstName: true, lastName: true } },
    },
  });

  if (appointments.length !== appointmentIds.length) {
    throw new Error("VOLUNTEER_BLOCK_CANCEL_MISMATCH");
  }

  const doctorName = appointments[0]?.professional
    ? `Dr. ${appointments[0].professional.firstName} ${appointments[0].professional.lastName}`
    : "Profissional";

  for (const appointment of appointments) {
    await db.appointment.update({
      where: { id: appointment.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: cancelledByUserId,
        cancelReason: reason,
        remindersEpoch: { increment: 1 },
      },
    });

    const cancellerName = doctorName;
    const cancelCopy = storedNotificationText(
      "notif.apptCancelled.title",
      "notif.apptCancelledProReschedule.body",
      {
        name: cancellerName,
        date: appointment.scheduledAt.toISOString(),
      },
    );

    await createNotification({
      userId: appointment.patient.userId,
      title: cancelCopy.title,
      body: cancelCopy.body,
      type: "system",
      data: {
        appointmentId: appointment.id,
        titleKey: "notif.apptCancelled.title",
        bodyKey: "notif.apptCancelledProReschedule.body",
        bodyParams: { name: cancellerName, scheduledAt: appointment.scheduledAt.toISOString() },
      },
    }).catch(() => {});

    notifySlotAlerts({
      professionalId: appointment.professionalId,
      freedAt: appointment.scheduledAt,
    }).catch(() => {});

    try {
      const patientUser = await db.user.findUnique({
        where: { id: appointment.patient.userId },
        select: { email: true, language: true, timezone: true } as never,
      }) as { email: string; language: string | null; timezone?: string } | null;

      if (patientUser?.email) {
        await sendAppointmentCancelled({
          patientEmail: patientUser.email,
          patientName:
            `${safeDecrypt(appointment.patient.firstName)} ${safeDecrypt(appointment.patient.lastName)}`.trim(),
          doctorName,
          scheduledAt: appointment.scheduledAt,
          appointmentId: appointment.id,
          language: patientUser.language ?? undefined,
          patientTimezone: patientUser.timezone,
        });
      }
    } catch (e) {
      console.error("[VOLUNTEER-BLOCK-CANCEL EMAIL]", appointment.id, e);
    }
  }
}
