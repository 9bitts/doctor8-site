// Meta WhatsApp Cloud API — appointment reminder templates (utility category).

import type { Lang } from "@/lib/i18n/translations";
import { logWhatsAppDelivery } from "@/lib/integration-logs";
import {
  clinicalDocumentLabel,
  formatWhatsAppDateTime,
  whatsappTemplateLocale,
} from "@/lib/whatsapp-i18n";

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || "v22.0";

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() &&
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  );
}

export type WhatsAppReadiness = {
  configured: boolean;
  reminderTemplate: string;
  documentTemplate: string;
  readyToSend: boolean;
  webhookConfigured: boolean;
  appSecretConfigured: boolean;
  productionReady: boolean;
  fallbackMode: "wa_me_links";
  note: string;
};

/** Inspect config without calling Meta (no network). Safe for admin dashboards. */
export function getWhatsAppReadiness(): WhatsAppReadiness {
  const configured = isWhatsAppConfigured();
  const reminderTemplate =
    process.env.WHATSAPP_REMINDER_TEMPLATE?.trim() || "doctor8_appointment_reminder";
  const documentTemplate =
    process.env.WHATSAPP_DOCUMENT_TEMPLATE?.trim() || "doctor8_clinical_document";
  const webhookConfigured = Boolean(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim());
  const appSecretConfigured = Boolean(process.env.WHATSAPP_APP_SECRET?.trim());
  const productionReady = configured && webhookConfigured && appSecretConfigured;

  let note: string;
  if (!configured) {
    note =
      "Meta API not configured — app uses wa.me link fallbacks until WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are set.";
  } else if (productionReady) {
    note = `Production stack ready (token, phone ID, webhook verify, app secret). Template "${reminderTemplate}" must be approved in Meta Business Manager.`;
  } else if (!webhookConfigured) {
    note = "Credentials set. Add WHATSAPP_WEBHOOK_VERIFY_TOKEN and subscribe webhook at POST /api/webhooks/whatsapp.";
  } else if (!appSecretConfigured) {
    note = "Credentials + webhook set. Add WHATSAPP_APP_SECRET for signed webhook verification.";
  } else {
    note = "Credentials set. Complete webhook + app secret for production delivery status.";
  }

  return {
    configured,
    reminderTemplate,
    documentTemplate,
    readyToSend: configured,
    webhookConfigured,
    appSecretConfigured,
    productionReady,
    fallbackMode: "wa_me_links",
    note,
  };
}

/** Optional live probe — validates token against Graph API (admin only). */
export async function probeWhatsAppGraph(): Promise<{ ok: boolean; detail: string }> {
  if (!isWhatsAppConfigured()) {
    return { ok: false, detail: "Not configured" };
  }
  const token = process.env.WHATSAPP_ACCESS_TOKEN!.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!.trim();
  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}?fields=display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 300 } },
    );
    const data = (await res.json()) as { display_phone_number?: string; verified_name?: string; error?: { message?: string } };
    if (!res.ok) {
      return { ok: false, detail: data.error?.message || `HTTP ${res.status}` };
    }
    return {
      ok: true,
      detail: `${data.verified_name || "WhatsApp"} · ${data.display_phone_number || phoneNumberId}`,
    };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "Probe failed" };
  }
}

/** E.164 digits only, no +. Prepends default country code when missing. */
export function normalizeWhatsAppPhone(
  raw: string,
  defaultCountry = process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || "55"
): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return `${defaultCountry}${digits}`;
  return digits.length >= 10 ? `${defaultCountry}${digits}` : null;
}

export async function sendAppointmentReminderWhatsApp(opts: {
  toPhone: string;
  patientName: string;
  doctorName: string;
  scheduledAt: Date;
  meetingUrl?: string | null;
  language?: Lang;
}): Promise<{ ok: boolean; messageId?: string; error?: string; skipped?: boolean }> {
  if (!isWhatsAppConfigured()) {
    return { ok: false, skipped: true };
  }

  const lang = opts.language ?? "pt";
  const token = process.env.WHATSAPP_ACCESS_TOKEN!.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!.trim();
  const templateName =
    process.env.WHATSAPP_REMINDER_TEMPLATE?.trim() || "doctor8_appointment_reminder";
  const templateLang = whatsappTemplateLocale(lang);

  const to = normalizeWhatsAppPhone(opts.toPhone);
  if (!to) return { ok: false, error: "Invalid phone number" };

  const firstName = opts.patientName.trim().split(/\s+/)[0] || opts.patientName;
  const { combined } = formatWhatsAppDateTime(opts.scheduledAt, lang);

  const components: Record<string, unknown>[] = [
    {
      type: "body",
      parameters: [
        { type: "text", text: firstName.slice(0, 256) },
        { type: "text", text: opts.doctorName.slice(0, 256) },
        { type: "text", text: combined.slice(0, 256) },
      ],
    },
  ];

  if (opts.meetingUrl && process.env.WHATSAPP_REMINDER_URL_BUTTON === "1") {
    try {
      const url = new URL(opts.meetingUrl);
      const suffix = (url.pathname.replace(/^\//, "") + url.search).slice(0, 200);
      if (suffix) {
        components.push({
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: suffix }],
        });
      }
    } catch {
      /* template may not have a URL button */
    }
  }

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLang },
          components,
        },
      }),
    }
  );

  const data = (await res.json().catch(() => ({}))) as {
    messages?: { id: string }[];
    error?: { message?: string };
  };

  if (!res.ok) {
    console.error("[WHATSAPP] Send failed:", JSON.stringify(data));
    await logWhatsAppDelivery({
      template: templateName,
      phone: to,
      status: "failed",
      detail: data?.error?.message || `HTTP ${res.status}`,
    });
    return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
  }

  const messageId = data.messages?.[0]?.id;
  await logWhatsAppDelivery({
    messageId,
    template: templateName,
    phone: to,
    status: "sent",
  });
  return { ok: true, messageId };
}

export type WhatsAppDeliveryStatus = "SENT" | "FAILED" | "NO_PHONE" | "SKIPPED";

/** Clinical document / prescription link via approved utility template. */
export async function sendClinicalDocumentWhatsApp(opts: {
  toPhone: string;
  patientName: string;
  doctorName: string;
  accessUrl: string;
  documentLabel?: string;
  language?: Lang;
}): Promise<{ ok: boolean; messageId?: string; error?: string; skipped?: boolean }> {
  if (!isWhatsAppConfigured()) {
    return { ok: false, skipped: true };
  }

  const lang = opts.language ?? "pt";
  const token = process.env.WHATSAPP_ACCESS_TOKEN!.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!.trim();
  const templateName =
    process.env.WHATSAPP_DOCUMENT_TEMPLATE?.trim() || "doctor8_clinical_document";
  const templateLang = whatsappTemplateLocale(lang);

  const to = normalizeWhatsAppPhone(opts.toPhone);
  if (!to) return { ok: false, error: "Invalid phone number" };

  const firstName = opts.patientName.trim().split(/\s+/)[0] || opts.patientName;
  const docLabel = (opts.documentLabel || clinicalDocumentLabel("document", lang)).slice(0, 256);
  const link = opts.accessUrl.slice(0, 256);

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLang },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: firstName.slice(0, 256) },
                { type: "text", text: opts.doctorName.slice(0, 256) },
                { type: "text", text: docLabel },
                { type: "text", text: link },
              ],
            },
          ],
        },
      }),
    },
  );

  const data = (await res.json().catch(() => ({}))) as {
    messages?: { id: string }[];
    error?: { message?: string };
  };

  if (!res.ok) {
    console.error("[WHATSAPP] Document send failed:", JSON.stringify(data));
    await logWhatsAppDelivery({
      template: templateName,
      phone: to,
      status: "failed",
      detail: data?.error?.message || `HTTP ${res.status}`,
    });
    return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
  }

  const messageId = data.messages?.[0]?.id;
  await logWhatsAppDelivery({
    messageId,
    template: templateName,
    phone: to,
    status: "sent",
  });
  return { ok: true, messageId };
}

export function buildClinicalDocumentWaMeUrl(
  phone: string,
  message: string,
): string | null {
  const to = normalizeWhatsAppPhone(phone);
  if (!to) return null;
  return `https://wa.me/${to}?text=${encodeURIComponent(message)}`;
}

/** Humanitarian "your turn" template — falls back to wa.me when API unset. */
export async function sendHumanitarianYourTurnWhatsApp(opts: {
  toPhone: string;
  patientFirstName: string;
  professionalName: string;
  entryUrl: string;
  language?: Lang;
}): Promise<{ ok: boolean; messageId?: string; skipped?: boolean; waMeUrl?: string }> {
  const lang = opts.language ?? "es";
  const waMeUrl =
    buildClinicalDocumentWaMeUrl(
      opts.toPhone,
      `Hola ${opts.patientFirstName}, es tu turno en Doctor8. ${opts.professionalName} te espera: ${opts.entryUrl}`,
    ) ?? undefined;

  if (!isWhatsAppConfigured()) {
    return { ok: false, skipped: true, waMeUrl };
  }

  const templateName =
    process.env.WHATSAPP_HUMANITARIAN_TURN_TEMPLATE?.trim() || "doctor8_humanitarian_your_turn";
  const token = process.env.WHATSAPP_ACCESS_TOKEN!.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!.trim();
  const to = normalizeWhatsAppPhone(opts.toPhone);
  if (!to) return { ok: false, skipped: true, waMeUrl };

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: whatsappTemplateLocale(lang) },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: opts.patientFirstName.slice(0, 256) },
                { type: "text", text: opts.professionalName.slice(0, 256) },
                { type: "text", text: opts.entryUrl.slice(0, 256) },
              ],
            },
          ],
        },
      }),
    },
  );

  const data = (await res.json().catch(() => ({}))) as {
    messages?: { id: string }[];
    error?: { message?: string };
  };

  if (!res.ok) {
    await logWhatsAppDelivery({
      template: templateName,
      phone: to,
      status: "failed",
      detail: data?.error?.message,
    });
    return { ok: false, skipped: false, waMeUrl };
  }

  const messageId = data.messages?.[0]?.id;
  await logWhatsAppDelivery({ messageId, template: templateName, phone: to, status: "sent" });
  return { ok: true, messageId, waMeUrl };
}
