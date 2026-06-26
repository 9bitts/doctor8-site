// Meta WhatsApp Cloud API ? appointment reminder templates (utility category).

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || "v22.0";

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() &&
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  );
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
}): Promise<{ ok: boolean; messageId?: string; error?: string; skipped?: boolean }> {
  if (!isWhatsAppConfigured()) {
    return { ok: false, skipped: true };
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN!.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!.trim();
  const templateName =
    process.env.WHATSAPP_REMINDER_TEMPLATE?.trim() || "doctor8_appointment_reminder";
  const templateLang = process.env.WHATSAPP_TEMPLATE_LANG?.trim() || "pt_BR";

  const to = normalizeWhatsAppPhone(opts.toPhone);
  if (!to) return { ok: false, error: "Invalid phone number" };

  const time = opts.scheduledAt.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = opts.scheduledAt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

  const firstName = opts.patientName.trim().split(/\s+/)[0] || opts.patientName;

  const components: Record<string, unknown>[] = [
    {
      type: "body",
      parameters: [
        { type: "text", text: firstName.slice(0, 256) },
        { type: "text", text: opts.doctorName.slice(0, 256) },
        { type: "text", text: `${date} ?s ${time}`.slice(0, 256) },
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
    return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
  }

  return { ok: true, messageId: data.messages?.[0]?.id };
}

export type WhatsAppDeliveryStatus = "SENT" | "FAILED" | "NO_PHONE" | "SKIPPED";

/** Clinical document / prescription link via approved utility template. */
export async function sendClinicalDocumentWhatsApp(opts: {
  toPhone: string;
  patientName: string;
  doctorName: string;
  accessUrl: string;
  documentLabel?: string;
}): Promise<{ ok: boolean; messageId?: string; error?: string; skipped?: boolean }> {
  if (!isWhatsAppConfigured()) {
    return { ok: false, skipped: true };
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN!.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!.trim();
  const templateName =
    process.env.WHATSAPP_DOCUMENT_TEMPLATE?.trim() || "doctor8_clinical_document";
  const templateLang = process.env.WHATSAPP_TEMPLATE_LANG?.trim() || "pt_BR";

  const to = normalizeWhatsAppPhone(opts.toPhone);
  if (!to) return { ok: false, error: "Invalid phone number" };

  const firstName = opts.patientName.trim().split(/\s+/)[0] || opts.patientName;
  const docLabel = (opts.documentLabel || "documento clínico").slice(0, 256);
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
    return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
  }

  return { ok: true, messageId: data.messages?.[0]?.id };
}

export function buildClinicalDocumentWaMeUrl(
  phone: string,
  message: string,
): string | null {
  const to = normalizeWhatsAppPhone(phone);
  if (!to) return null;
  return `https://wa.me/${to}?text=${encodeURIComponent(message)}`;
}
