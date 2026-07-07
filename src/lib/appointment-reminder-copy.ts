import { isDentistSpecialty } from "@/lib/profession-label";
import { Lang, translate } from "@/lib/i18n/translations";
import { interpolate } from "@/lib/notification-i18n";
import { formatWhatsAppDateTime } from "@/lib/whatsapp-i18n";

export function isAppointment24hWhatsAppEnabled(): boolean {
  const raw = process.env.APPOINTMENT_24H_WHATSAPP_ENABLED
    ?? process.env.PSYCHOLOGY_24H_WHATSAPP_ENABLED;
  if (raw === undefined || raw === "") return true;
  const n = raw.trim().toLowerCase();
  return n === "true" || n === "1" || n === "yes";
}

export function isAppointmentSmsRemindersEnabled(): boolean {
  const raw = process.env.APPOINTMENT_SMS_REMINDERS_ENABLED;
  if (raw === undefined || raw === "") return true;
  const n = raw.trim().toLowerCase();
  return n === "true" || n === "1" || n === "yes";
}

export function buildAppointmentReminderSmsBody(opts: {
  patientName: string;
  doctorName: string;
  scheduledAt: Date;
  lang: Lang;
  patientTimezone?: string;
  specialty?: string | null;
  appointmentType?: string | null;
  hoursUntil?: number;
}): string {
  const firstName = opts.patientName.trim().split(/\s+/)[0] || opts.patientName;
  const { date, time } = formatWhatsAppDateTime(
    opts.scheduledAt,
    opts.lang,
    opts.patientTimezone,
  );
  const isDentist = isDentistSpecialty(opts.specialty);
  const inPerson = opts.appointmentType === "IN_PERSON";
  const hours = opts.hoursUntil ?? 3;

  if (isDentist && inPerson) {
    const key = hours >= 12 ? "dental.sms.reminder.inPersonTomorrow" : "dental.sms.reminder.inPersonSoon";
    return interpolate(translate(opts.lang, key), {
      name: firstName,
      doctor: opts.doctorName,
      time,
      date,
    });
  }

  if (isDentist) {
    const key = hours >= 12 ? "dental.sms.reminder.teleTomorrow" : "dental.sms.reminder.teleSoon";
    return interpolate(translate(opts.lang, key), {
      name: firstName,
      doctor: opts.doctorName,
      time,
      date,
    });
  }

  const key = hours >= 12 ? "sms.reminder.bodyTomorrow" : "sms.reminder.bodySoon";
  return interpolate(translate(opts.lang, key), {
    name: firstName,
    doctor: opts.doctorName,
    time,
    date,
  });
}

export function buildAppointmentReminderWaMeMessageForAppointment(opts: {
  patientName: string;
  doctorName: string;
  scheduledAt: Date;
  meetingUrl?: string | null;
  lang: Lang;
  patientTimezone?: string;
  specialty?: string | null;
  appointmentType?: string | null;
  hoursUntil?: number;
}): string {
  const firstName = opts.patientName.trim().split(/\s+/)[0] || opts.patientName;
  const { date, time } = formatWhatsAppDateTime(
    opts.scheduledAt,
    opts.lang,
    opts.patientTimezone,
  );
  const isDentist = isDentistSpecialty(opts.specialty);
  const inPerson = opts.appointmentType === "IN_PERSON";
  const hours = opts.hoursUntil ?? 3;

  let bodyKey = "wa.reminder.body";
  if (isDentist && inPerson) {
    bodyKey = hours >= 12 ? "dental.wa.reminder.inPersonTomorrow" : "dental.wa.reminder.inPersonSoon";
  } else if (isDentist) {
    bodyKey = hours >= 12 ? "dental.wa.reminder.teleTomorrow" : "dental.wa.reminder.teleSoon";
  }

  let msg = `${translate(opts.lang, "wa.reminder.header")}\n\n${interpolate(translate(opts.lang, bodyKey), {
    name: firstName,
    doctor: opts.doctorName,
    time,
    date,
  })}`;

  if (opts.meetingUrl) {
    msg += `\n\n${interpolate(translate(opts.lang, "wa.reminder.join"), { url: opts.meetingUrl })}`;
  }
  msg += `\n\n${translate(opts.lang, "wa.reminder.footer")}`;
  return msg;
}
