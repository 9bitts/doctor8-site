import { logWhatsAppDelivery } from "@/lib/integration-logs";

type MetaInboundMessage = {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
};

type MetaWebhookBody = {
  entry?: {
    changes?: {
      value?: {
        statuses?: {
          id?: string;
          status?: string;
          recipient_id?: string;
          errors?: { title?: string }[];
        }[];
        messages?: MetaInboundMessage[];
      };
    }[];
  }[];
};

function inboundDetail(msg: MetaInboundMessage): string {
  if (msg.type === "text" && msg.text?.body) {
    return `text:${msg.text.body.length}chars`;
  }
  return msg.type || "message";
}

/** Persist delivery receipts and inbound message metadata for Doctor8 admin logs. */
export async function processWhatsAppWebhookEvents(body: unknown): Promise<void> {
  const entry = (body as MetaWebhookBody)?.entry;
  if (!Array.isArray(entry)) return;

  for (const e of entry) {
    const changes = e?.changes;
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      const value = change?.value;
      const statuses = value?.statuses;
      if (Array.isArray(statuses)) {
        for (const st of statuses) {
          await logWhatsAppDelivery({
            messageId: st.id,
            phone: st.recipient_id,
            status: st.status || "unknown",
            detail: st.errors?.[0]?.title,
          });
        }
      }

      const messages = value?.messages;
      if (Array.isArray(messages)) {
        for (const msg of messages) {
          await logWhatsAppDelivery({
            messageId: msg.id,
            phone: msg.from,
            status: "received",
            detail: inboundDetail(msg),
          });
        }
      }
    }
  }
}
