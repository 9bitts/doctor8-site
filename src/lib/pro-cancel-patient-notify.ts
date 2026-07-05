import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText, interpolate } from "@/lib/notification-i18n";
import { Lang, normalizeLang, translate } from "@/lib/i18n/translations";
import { formatWhatsAppDateTime } from "@/lib/whatsapp-i18n";
import { DEFAULT_TIME_ZONE } from "@/lib/timezone";

export function buildPatientCancelNotifyMessage(opts: {
  patientFirstName: string;
  providerName: string;
  scheduledAt: Date;
  lang: Lang;
  timeZone?: string;
}): string {
  const firstName = opts.patientFirstName.trim().split(/\s+/)[0] || opts.patientFirstName;
  const { combined } = formatWhatsAppDateTime(
    opts.scheduledAt,
    opts.lang,
    opts.timeZone || DEFAULT_TIME_ZONE,
  );
  return interpolate(translate(opts.lang, "proappt.cancelPatientNotifyMessage"), {
    name: firstName,
    provider: opts.providerName,
    dateTime: combined,
  });
}

export async function sendPatientCancelChatMessage(opts: {
  patientUserId: string;
  providerUserId: string;
  providerName: string;
  patientFirstName: string;
  scheduledAt: Date;
  patientLang?: string | null;
  patientTimezone?: string | null;
}): Promise<void> {
  const lang = normalizeLang(opts.patientLang);
  const content = buildPatientCancelNotifyMessage({
    patientFirstName: opts.patientFirstName,
    providerName: opts.providerName,
    scheduledAt: opts.scheduledAt,
    lang,
    timeZone: opts.patientTimezone || undefined,
  });

  await db.message.create({
    data: {
      senderId: opts.providerUserId,
      receiverId: opts.patientUserId,
      content: encrypt(content),
    },
  });

  const messageCopy = storedNotificationText("notif.message.title", "notif.message.body", {
    name: opts.providerName,
  });
  await createNotification({
    userId: opts.patientUserId,
    title: messageCopy.title,
    body: messageCopy.body,
    type: "message",
    data: {
      fromUserId: opts.providerUserId,
      titleKey: "notif.message.title",
      bodyKey: "notif.message.body",
      bodyParams: { name: opts.providerName },
    },
  }).catch(() => {});
}
