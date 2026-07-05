// In-app + email notifications to providers for appointment lifecycle events.

import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import {
  mapProfessionalPathForSpecialty,
  professionalPortalBaseFromSpecialty,
} from "@/lib/psychologist-portal";
import { safeDecrypt } from "@/lib/psychoanalyst-api";
import {
  DEFAULT_TIME_ZONE,
  formatAppointmentTimeWithLabel,
  formatShortDateWithYear,
} from "@/lib/timezone";
import { EMAIL_LOCALE, normEmailLang, type EmailLang } from "@/lib/email-core";

export type ProviderContext = {
  userId: string;
  email: string;
  specialty: string | null;
  timezone: string;
  language: EmailLang;
  appointmentsUrl: string;
};

export async function resolveProviderContext(params: {
  professionalId?: string | null;
  psychoanalystId?: string | null;
  integrativeTherapistId?: string | null;
}): Promise<ProviderContext | null> {
  if (params.professionalId) {
    const pro = await db.professionalProfile.findUnique({
      where: { id: params.professionalId },
      select: {
        userId: true,
        specialty: true,
        timezone: true,
        user: { select: { email: true, language: true, timezone: true } },
      },
    });
    if (!pro) return null;
    const profileTz = (pro as { timezone?: string }).timezone;
    const tz = profileTz || pro.user.timezone || DEFAULT_TIME_ZONE;
    const base = professionalPortalBaseFromSpecialty(pro.specialty);
    return {
      userId: pro.userId,
      email: pro.user.email,
      specialty: pro.specialty,
      timezone: tz,
      language: normEmailLang(pro.user.language),
      appointmentsUrl: `${base}/appointments`,
    };
  }

  if (params.psychoanalystId) {
    const pa = await db.psychoanalystProfile.findUnique({
      where: { id: params.psychoanalystId },
      select: {
        userId: true,
        user: { select: { email: true, language: true, timezone: true } },
      },
    });
    if (!pa) return null;
    return {
      userId: pa.userId,
      email: pa.user.email,
      specialty: null,
      timezone: pa.user.timezone || DEFAULT_TIME_ZONE,
      language: normEmailLang(pa.user.language),
      appointmentsUrl: "/psychoanalyst/appointments",
    };
  }

  if (params.integrativeTherapistId) {
    const it = await db.integrativeTherapistProfile.findUnique({
      where: { id: params.integrativeTherapistId },
      select: {
        userId: true,
        user: { select: { email: true, language: true, timezone: true } },
      },
    });
    if (!it) return null;
    return {
      userId: it.userId,
      email: it.user.email,
      specialty: null,
      timezone: it.user.timezone || DEFAULT_TIME_ZONE,
      language: normEmailLang(it.user.language),
      appointmentsUrl: "/integrative-therapist/appointments",
    };
  }

  return null;
}

export function formatApptSlotForProvider(
  scheduledAt: Date,
  timezone: string,
  language: EmailLang,
): { date: string; time: string } {
  const locale = EMAIL_LOCALE[language];
  return {
    date: formatShortDateWithYear(scheduledAt, timezone, locale),
    time: formatAppointmentTimeWithLabel(scheduledAt, timezone, locale),
  };
}

export function buildProviderAppointmentsLink(
  provider: ProviderContext,
  appointmentId: string,
): string {
  const path = `${provider.appointmentsUrl}?id=${appointmentId}`;
  return mapProfessionalPathForSpecialty(provider.specialty, path);
}

export function decryptPatientName(firstName: string, lastName: string): string {
  return `${safeDecrypt(firstName)} ${safeDecrypt(lastName)}`.trim() || "Patient";
}

export async function notifyProfessionalNewBooking(params: {
  appointmentId: string;
  scheduledAt: Date;
  professionalId?: string | null;
  psychoanalystId?: string | null;
  integrativeTherapistId?: string | null;
  patientFirstName: string;
  patientLastName: string;
}): Promise<void> {
  const provider = await resolveProviderContext(params);
  if (!provider) return;

  const patientName = decryptPatientName(params.patientFirstName, params.patientLastName);
  const { date, time } = formatApptSlotForProvider(
    params.scheduledAt,
    provider.timezone,
    provider.language,
  );
  const link = buildProviderAppointmentsLink(provider, params.appointmentId);

  const copy = storedNotificationText(
    "notif.proApptBooked.title",
    "notif.proApptBooked.body",
    { date, time },
  );

  await createNotification({
    userId: provider.userId,
    title: copy.title,
    body: copy.body,
    type: "appointment_booked",
    data: {
      appointmentId: params.appointmentId,
      link,
      titleKey: "notif.proApptBooked.title",
      bodyKey: "notif.proApptBooked.body",
      bodyParams: { date, time, patient: patientName },
    },
  });

  try {
    const { sendProfessionalNewAppointmentEmail } = await import("@/lib/email");
    await sendProfessionalNewAppointmentEmail({
      providerEmail: provider.email,
      patientName,
      scheduledAt: params.scheduledAt,
      appointmentId: params.appointmentId,
      language: provider.language,
      providerTimezone: provider.timezone,
      appointmentsUrl: link,
    });
  } catch (e) {
    console.error("[PRO-APPT-NOTIFY] New booking email failed:", e);
  }
}

export async function notifyProfessionalCancelled(params: {
  appointmentId: string;
  scheduledAt: Date;
  professionalId?: string | null;
  psychoanalystId?: string | null;
  integrativeTherapistId?: string | null;
  patientFirstName: string;
  patientLastName: string;
}): Promise<void> {
  const provider = await resolveProviderContext(params);
  if (!provider) return;

  const patientName = decryptPatientName(params.patientFirstName, params.patientLastName);
  const { date, time } = formatApptSlotForProvider(
    params.scheduledAt,
    provider.timezone,
    provider.language,
  );
  const link = buildProviderAppointmentsLink(provider, params.appointmentId);

  const copy = storedNotificationText(
    "notif.proApptCancelled.title",
    "notif.proApptCancelled.body",
    { name: patientName, date, time },
  );

  await createNotification({
    userId: provider.userId,
    title: copy.title,
    body: copy.body,
    type: "system",
    data: {
      kind: "appointment_cancelled",
      appointmentId: params.appointmentId,
      link,
      titleKey: "notif.proApptCancelled.title",
      bodyKey: "notif.proApptCancelled.body",
      bodyParams: { name: patientName, date, time },
    },
  });

  try {
    const { sendProfessionalAppointmentCancelledEmail } = await import("@/lib/email");
    await sendProfessionalAppointmentCancelledEmail({
      providerEmail: provider.email,
      patientName,
      scheduledAt: params.scheduledAt,
      appointmentId: params.appointmentId,
      language: provider.language,
      providerTimezone: provider.timezone,
      appointmentsUrl: link,
    });
  } catch (e) {
    console.error("[PRO-APPT-NOTIFY] Cancel email failed:", e);
  }
}

export async function notifyProfessionalAttendanceConfirmed(params: {
  appointmentId: string;
  scheduledAt: Date;
  professionalId?: string | null;
  psychoanalystId?: string | null;
  patientFirstName: string;
  patientLastName: string;
}): Promise<void> {
  const provider = await resolveProviderContext(params);
  if (!provider) return;

  const patientName = decryptPatientName(params.patientFirstName, params.patientLastName);
  const { date, time } = formatApptSlotForProvider(
    params.scheduledAt,
    provider.timezone,
    provider.language,
  );
  const link = buildProviderAppointmentsLink(provider, params.appointmentId);

  const copy = storedNotificationText(
    "notif.proApptAttendance.title",
    "notif.proApptAttendance.body",
    { name: patientName, date, time },
  );

  await createNotification({
    userId: provider.userId,
    title: copy.title,
    body: copy.body,
    type: "appointment_confirmed",
    data: {
      appointmentId: params.appointmentId,
      link,
      titleKey: "notif.proApptAttendance.title",
      bodyKey: "notif.proApptAttendance.body",
      bodyParams: { name: patientName, date, time },
    },
  });
}
