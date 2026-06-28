import type { EmissionDeliverKind } from "@/lib/emission-deliver";
import { interpolate } from "@/lib/notification-i18n";
import { Lang, localeOf, normalizeLang, translate } from "@/lib/i18n/translations";

/** Meta WhatsApp template language codes (must match approved templates in Business Manager). */
export function whatsappTemplateLocale(lang: Lang): string {
  if (lang === "en") return "en_US";
  if (lang === "es") return "es";
  return process.env.WHATSAPP_TEMPLATE_LANG?.trim() || "pt_BR";
}

export function resolveWhatsAppLang(language: string | null | undefined): Lang {
  return normalizeLang(language);
}

export function formatWhatsAppDateTime(scheduledAt: Date, lang: Lang): { date: string; time: string; combined: string } {
  const locale = localeOf(lang);
  const date = scheduledAt.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
  const time = scheduledAt.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const combined = interpolate(translate(lang, "wa.reminder.dateTime"), { date, time });
  return { date, time, combined };
}

/** Free-text message for wa.me fallback when Meta API is not configured or send fails. */
export function buildAppointmentReminderWaMeMessage(opts: {
  patientName: string;
  doctorName: string;
  scheduledAt: Date;
  meetingUrl?: string | null;
  lang: Lang;
}): string {
  const { date, time } = formatWhatsAppDateTime(opts.scheduledAt, opts.lang);
  const firstName = opts.patientName.trim().split(/\s+/)[0] || opts.patientName;
  let msg = `${translate(opts.lang, "wa.reminder.header")}\n\n${interpolate(translate(opts.lang, "wa.reminder.body"), {
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

const DOC_TYPE_KEYS: Record<EmissionDeliverKind, string> = {
  prescription: "wa.doc.prescription",
  exam: "wa.doc.exam",
  document: "wa.doc.document",
};

export function clinicalDocumentLabel(kind: EmissionDeliverKind, lang: Lang): string {
  return translate(lang, DOC_TYPE_KEYS[kind]);
}

export function buildClinicalDocumentWaMeMessage(opts: {
  patientName: string;
  doctorName: string;
  kind: EmissionDeliverKind;
  accessUrl: string;
  lang: Lang;
  customMessage?: string;
}): string {
  if (opts.customMessage?.trim()) {
    return opts.customMessage
      .replace(/\{\{name\}\}/g, opts.patientName)
      .replace(/\{\{doctor\}\}/g, opts.doctorName)
      .replace(/\{\{link\}\}/g, opts.accessUrl);
  }
  return interpolate(translate(opts.lang, "wa.doc.message"), {
    name: opts.patientName,
    doctor: opts.doctorName,
    docType: clinicalDocumentLabel(opts.kind, opts.lang),
    url: opts.accessUrl,
  });
}
