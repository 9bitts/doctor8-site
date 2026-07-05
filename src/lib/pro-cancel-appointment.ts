import { interpolate, Lang, translate } from "@/lib/i18n/translations";
import { formatWhatsAppDateTime } from "@/lib/whatsapp-i18n";

export type ProCancelAppointmentTarget = {
  id: string;
  scheduledAt: string;
  status: string;
  patientFirstName: string;
  patientLastName: string;
  patientUserId: string | null;
  patientPhone: string | null;
};

export function canProfessionalCancelAppointment(apt: {
  status: string;
  scheduledAt: string;
}): boolean {
  if (apt.status !== "CONFIRMED" && apt.status !== "PENDING") return false;
  return new Date(apt.scheduledAt).getTime() > Date.now();
}

export function buildProCancelRescheduleMessage(opts: {
  patientFirstName: string;
  scheduledAt: Date;
  lang: Lang;
  timeZone: string;
}): string {
  const firstName = opts.patientFirstName.trim().split(/\s+/)[0] || opts.patientFirstName;
  const { combined } = formatWhatsAppDateTime(opts.scheduledAt, opts.lang, opts.timeZone);
  return interpolate(translate(opts.lang, "proappt.cancelRescheduleMessage"), {
    name: firstName,
    dateTime: combined,
  });
}

export const MESSAGE_DRAFT_STORAGE_KEY = "doctor8_msg_draft";
