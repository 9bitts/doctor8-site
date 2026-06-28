import { parseNotificationData } from "@/lib/notification-links";
import { Lang, localeOf, translate } from "@/lib/i18n/translations";

type TranslateFn = (key: string) => string;

export function interpolate(
  template: string,
  params: Record<string, string | number | undefined>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    params[key] !== undefined && params[key] !== null ? String(params[key]) : ""
  );
}

/** English fallback stored in DB; UI localizes via titleKey/bodyKey in notification data. */
export function storedNotificationText(
  titleKey: string,
  bodyKey: string,
  params?: Record<string, string | number | undefined>
): { title: string; body: string } {
  return {
    title: translate("en", titleKey),
    body: interpolate(translate("en", bodyKey), params ?? {}),
  };
}

function formatParams(
  params: Record<string, unknown> | undefined,
  lang: Lang
): Record<string, string> {
  if (!params) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (key === "scheduledAt" && typeof value === "string") {
      out.date = new Date(value).toLocaleDateString(localeOf(lang));
      continue;
    }
    out[key] = String(value);
  }
  return out;
}

const LEGACY_TITLE_KEYS: Record<string, string> = {
  "New message": "notif.message.title",
  "Document shared": "notif.docShared.title",
  "Document unshared": "notif.docUnshared.title",
  "New medical record shared": "notif.recordShared.title",
  "Recurso compartilhado por colega": "notif.colleagueResource.title",
  "Novo recurso compartilhado": "notif.newResource.title",
  "Lembrete de consulta": "notif.apptReminder.title",
  "Consulta cancelada": "notif.apptCancelled.title",
  "Você perdeu sua vez": "notif.jit.missed.title",
  "É a sua vez!": "notif.jit.yourTurn.title",
  "Nova receita / New prescription": "notif.prescription.title",
  "Novo pedido de exame / New exam request": "notif.exam.title",
  "Novo documento clínico / New clinical document": "notif.document.title",
};

function legacyTitleKey(title: string): string | null {
  if (LEGACY_TITLE_KEYS[title]) return LEGACY_TITLE_KEYS[title];
  const hoursMatch = title.match(/^(?:Consulta em|Appointment in) (\d+)h$/);
  if (hoursMatch) return "notif.apptReminder.titleHours";
  if (title.endsWith(" está online") || title.endsWith(" is online")) {
    return "notif.favoriteOnline.title";
  }
  return null;
}

function legacyTitleParams(title: string, data: Record<string, unknown>): Record<string, string> {
  const hoursMatch = title.match(/^(?:Consulta em|Appointment in) (\d+)h$/);
  if (hoursMatch) return { hours: hoursMatch[1] };
  if (data.kind === "favorite_online" && typeof data.professionalName === "string") {
    return { name: data.professionalName };
  }
  const onlineMatch = title.match(/^(.+) (?:está online|is online)$/);
  if (onlineMatch) return { name: onlineMatch[1] };
  return {};
}

export function localizeNotification(
  notif: { title: string; body: string; type: string; data: unknown },
  t: TranslateFn,
  lang: Lang
): { title: string; body: string } {
  const d = parseNotificationData(notif.data);
  const titleKey =
    (typeof d.titleKey === "string" ? d.titleKey : null) ?? legacyTitleKey(notif.title);
  const bodyKey = typeof d.bodyKey === "string" ? d.bodyKey : null;

  if (!titleKey && !bodyKey) {
    return { title: notif.title, body: notif.body };
  }

  const params = {
    ...legacyTitleParams(notif.title, d),
    ...formatParams(
      typeof d.bodyParams === "object" && d.bodyParams !== null
        ? (d.bodyParams as Record<string, unknown>)
        : undefined,
      lang
    ),
  };

  const title = titleKey ? interpolate(t(titleKey), params) : notif.title;
  const body = bodyKey ? interpolate(t(bodyKey), params) : notif.body;

  return { title, body };
}

export function formatNotificationTimeAgo(iso: string, t: TranslateFn): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t("notif.time.justNow");
  if (m < 60) return interpolate(t("notif.time.minutesAgo"), { count: m });
  const h = Math.floor(m / 60);
  if (h < 24) return interpolate(t("notif.time.hoursAgo"), { count: h });
  const d = Math.floor(h / 24);
  return interpolate(t("notif.time.daysAgo"), { count: d });
}
