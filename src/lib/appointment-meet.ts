import { db } from "@/lib/db";
import { createAppointmentMeetLink } from "@/lib/google-meet";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import { safeDecrypt } from "@/lib/psychoanalyst-api";

function appointmentJoinWindow(scheduledAt: Date, durationMins: number) {
  const start = scheduledAt.getTime();
  const now = Date.now();
  return {
    joinOpensAt: start - 10 * 60 * 1000,
    joinClosesAt: start + (durationMins + 30) * 60 * 1000,
    now,
  };
}

export async function handoffAppointmentViaGoogleMeet(
  appointmentId: string,
  providerUserId: string,
): Promise<{ meetUrl: string; patientName: string; providerName: string }> {
  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { select: { userId: true, firstName: true, lastName: true } },
      professional: { select: { userId: true, firstName: true, lastName: true } },
      psychoanalyst: { select: { userId: true, firstName: true, lastName: true } },
    },
  });

  if (!appointment) throw new Error("NOT_FOUND");

  const providerUserIdFromAppt =
    appointment.professional?.userId ?? appointment.psychoanalyst?.userId;
  if (providerUserIdFromAppt !== providerUserId) throw new Error("Forbidden");

  if (appointment.status === "CANCELLED") throw new Error("CANCELLED");
  if (appointment.type !== "TELECONSULT") throw new Error("NOT_TELECONSULT");
  if (appointment.status !== "CONFIRMED") throw new Error("NOT_ACTIVE");

  const duration = appointment.durationMins || 30;
  const { joinOpensAt, joinClosesAt, now } = appointmentJoinWindow(
    appointment.scheduledAt,
    duration,
  );
  if (now < joinOpensAt) throw new Error("TOO_EARLY");
  if (now > joinClosesAt) throw new Error("EXPIRED");

  const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim();
  let providerName = "Profissional Doctor8";
  if (appointment.professional) {
    providerName = `Dr. ${appointment.professional.firstName} ${appointment.professional.lastName}`;
  } else if (appointment.psychoanalyst) {
    providerName = `${safeDecrypt(appointment.psychoanalyst.firstName)} ${safeDecrypt(appointment.psychoanalyst.lastName)}`.trim();
  }

  const [providerUser, patientUser] = await Promise.all([
    db.user.findUnique({ where: { id: providerUserId }, select: { email: true } }),
    db.user.findUnique({ where: { id: appointment.patient.userId }, select: { email: true } }),
  ]);

  const meetUrl = await createAppointmentMeetLink({
    appointmentId,
    patientName,
    providerName,
    scheduledAt: appointment.scheduledAt,
    durationMins: duration,
    hostEmail: providerUser?.email ?? null,
    attendeeEmails: [providerUser?.email, patientUser?.email].filter(Boolean) as string[],
  });

  await db.appointment.update({
    where: { id: appointmentId },
    data: {
      videoChannel: "GOOGLE_MEET",
      meetingUrl: meetUrl,
      meetingRoomId: null,
    },
  });

  const handoffCopy = storedNotificationText(
    "hum.notif.meetHandoff.title",
    "hum.notif.meetHandoff.body",
    { professional: providerName },
  );
  await createNotification({
    userId: appointment.patient.userId,
    title: handoffCopy.title,
    body: handoffCopy.body,
    type: "system",
    data: {
      link: `/video/${appointmentId}`,
      titleKey: "hum.notif.meetHandoff.title",
      bodyKey: "hum.notif.meetHandoff.body",
      bodyParams: { professional: providerName },
      meetUrl,
      appointmentId,
    },
  }).catch(() => {});

  return { meetUrl, patientName, providerName };
}
