import { parseNotificationData } from "@/lib/notification-links";
import { looksLikeEncryptedPayload } from "@/lib/encryption";
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

const TITLE_TO_BODY_KEY: Record<string, string> = {
  "notif.message.title": "notif.message.body",
  "notif.docShared.title": "notif.docShared.body",
  "notif.docUnshared.title": "notif.docUnshared.body",
  "notif.recordShared.title": "notif.recordShared.body",
  "notif.colleagueResource.title": "notif.colleagueResource.body",
  "notif.newResource.title": "notif.newResource.body",
  "notif.patientShare.titleHistory": "notif.patientShare.bodyHistory",
  "notif.patientShare.titleMeds": "notif.patientShare.bodyMeds",
  "notif.sessionShared.title": "notif.sessionShared.body",
  "notif.integrativeShared.title": "notif.integrativeShared.body",
  "notif.chartShare.title": "notif.chartShare.body",
  "notif.referral.title": "notif.referral.body",
  "notif.referralColleague.title": "notif.referralColleague.body",
  "notif.prescription.title": "notif.prescription.body",
  "notif.exam.title": "notif.exam.body",
  "notif.document.title": "notif.document.body",
};

const LEGACY_TITLE_KEYS: Record<string, string> = {
  "New message": "notif.message.title",
  "Nova mensagem": "notif.message.title",
  "Nuevo mensaje": "notif.message.title",
  "Document shared": "notif.docShared.title",
  "Documento compartilhado": "notif.docShared.title",
  "Documento compartido": "notif.docShared.title",
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

const TYPE_BODY_KEY: Record<string, string> = {
  message: "notif.message.body",
  shared_record: "notif.docShared.body",
  DOCUMENT_SHARED: "notif.newResource.body",
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

function resolveBodyKey(
  titleKey: string | null,
  type: string,
  title: string,
  data: Record<string, unknown>,
): string | null {
  if (titleKey && TITLE_TO_BODY_KEY[titleKey]) return TITLE_TO_BODY_KEY[titleKey];

  const legacyTitle = legacyTitleKey(title);
  if (legacyTitle && TITLE_TO_BODY_KEY[legacyTitle]) return TITLE_TO_BODY_KEY[legacyTitle];

  if (TYPE_BODY_KEY[type]) {
    if (type === "shared_record" && data.kind === "patient_unshared_document") {
      return "notif.docUnshared.body";
    }
    return TYPE_BODY_KEY[type];
  }

  return null;
}

function sanitizeParamValue(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || looksLikeEncryptedPayload(trimmed)) return undefined;
  return trimmed;
}

function notificationParams(
  data: Record<string, unknown>,
  title: string,
  lang: Lang,
): Record<string, string> {
  const params = {
    ...legacyTitleParams(title, data),
    ...formatParams(
      typeof data.bodyParams === "object" && data.bodyParams !== null
        ? (data.bodyParams as Record<string, unknown>)
        : undefined,
      lang,
    ),
  };

  for (const key of ["name", "title", "doctor", "patient", "professional", "therapist", "analyst"] as const) {
    if (params[key]) continue;
    const raw = data[key];
    if (typeof raw === "string") {
      const clean = sanitizeParamValue(raw);
      if (clean) params[key] = clean;
    }
  }

  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    const clean = sanitizeParamValue(value);
    if (clean) out[key] = clean;
  }
  return out;
}

function cleanLocalizedBody(text: string): string {
  return text.replace(/\s{2,}/g, " ").replace(/:\s*$/, "").trim();
}

function safeNotificationBody(body: string, bodyKey: string | null, t: TranslateFn): string {
  if (!looksLikeEncryptedPayload(body)) return body;
  if (bodyKey) return cleanLocalizedBody(interpolate(t(bodyKey), {}));
  return t("notif.body.unavailable");
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
  const bodyKey =
    (typeof d.bodyKey === "string" ? d.bodyKey : null) ??
    resolveBodyKey(titleKey, notif.type, notif.title, d);

  if (!titleKey && !bodyKey) {
    return {
      title: notif.title,
      body: safeNotificationBody(notif.body, null, t),
    };
  }

  const params = notificationParams(d, notif.title, lang);

  const title = titleKey
    ? cleanLocalizedBody(interpolate(t(titleKey), params))
    : notif.title;
  const body = bodyKey
    ? cleanLocalizedBody(interpolate(t(bodyKey), params))
    : safeNotificationBody(notif.body, bodyKey, t);

  return {
    title,
    body: safeNotificationBody(body, bodyKey, t),
  };
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
