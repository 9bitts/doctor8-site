import { Lang, translate } from "@/lib/i18n/translations";
import { interpolate } from "@/lib/notification-i18n";
import { formatWhatsAppDateTime } from "@/lib/whatsapp-i18n";

export type ProCancelAppointmentTarget = {
  id: string;
  scheduledAt: string;
  durationMins?: number;
  status: string;
  patientFirstName: string;
  patientLastName: string;
  patientUserId: string | null;
  patientPhone: string | null;
  patientJoinedAt?: string | null;
  professionalJoinedAt?: string | null;
};

export function isAppointmentConsultationInProgress(apt: {
  scheduledAt: string;
  durationMins?: number;
  patientJoinedAt?: string | null;
  professionalJoinedAt?: string | null;
}): boolean {
  const now = Date.now();
  const startMs = new Date(apt.scheduledAt).getTime();
  const endMs = startMs + (apt.durationMins ?? 30) * 60_000;

  return (
    apt.patientJoinedAt != null ||
    apt.professionalJoinedAt != null ||
    (now >= startMs && now < endMs)
  );
}

/** Professionals may cancel open appointments unless the visit is actively in progress. */
export function canProfessionalCancelAppointment(apt: ProCancelAppointmentTarget): boolean {
  if (apt.status !== "CONFIRMED" && apt.status !== "PENDING") return false;
  return !isAppointmentConsultationInProgress(apt);
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
