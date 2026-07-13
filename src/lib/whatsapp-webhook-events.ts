import { db } from "@/lib/db";
import { findPatientProfileIdByWaPhone } from "@/lib/admin/whatsapp-patient-link";
import { logWhatsAppDelivery } from "@/lib/integration-logs";

type MetaMediaPayload = {
  id?: string;
  caption?: string;
};

type MetaInboundMessage = {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  image?: MetaMediaPayload;
  audio?: MetaMediaPayload;
  document?: MetaMediaPayload;
};

type MetaWebhookBody = {
  entry?: {
    changes?: {
      value?: {
        contacts?: { profile?: { name?: string } }[];
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

function parseInboundMessage(msg: MetaInboundMessage): {
  type: string;
  body: string | null;
  mediaId: string | null;
} {
  const msgType = msg.type || "unsupported";

  if (msgType === "text") {
    return {
      type: "text",
      body: msg.text?.body?.trim() || null,
      mediaId: null,
    };
  }

  if (msgType === "image" || msgType === "audio" || msgType === "document") {
    const media = msg[msgType];
    return {
      type: msgType,
      body: media?.caption?.trim() || null,
      mediaId: media?.id || null,
    };
  }

  return {
    type: "unsupported",
    body: `[${msgType}]`,
    mediaId: null,
  };
}

async function persistInboundMessage(
  msg: MetaInboundMessage,
  displayName: string | null,
): Promise<void> {
  const waPhone = msg.from?.trim();
  const waMessageId = msg.id?.trim();
  if (!waPhone) return;

  if (waMessageId) {
    const existing = await db.whatsAppMessage.findUnique({
      where: { waMessageId },
      select: { id: true },
    });
    if (existing) return;
  }

  const now = new Date();
  const parsed = parseInboundMessage(msg);

  let patientProfileId: string | null = null;
  const existingConversation = await db.whatsAppConversation.findUnique({
    where: { waPhone },
    select: { id: true, patientProfileId: true },
  });

  if (!existingConversation) {
    patientProfileId = await findPatientProfileIdByWaPhone(waPhone);
  }

  const conversation = await db.whatsAppConversation.upsert({
    where: { waPhone },
    create: {
      waPhone,
      displayName,
      patientProfileId,
      status: "open",
      lastMessageAt: now,
      lastInboundAt: now,
      unreadCount: 1,
    },
    update: {
      ...(displayName ? { displayName } : {}),
      lastMessageAt: now,
      lastInboundAt: now,
      unreadCount: { increment: 1 },
      status: "open",
    },
    select: { id: true },
  });

  await db.whatsAppMessage.create({
    data: {
      conversationId: conversation.id,
      direction: "inbound",
      waMessageId: waMessageId || null,
      type: parsed.type,
      body: parsed.body,
      mediaId: parsed.mediaId,
      status: "received",
    },
  });
}

async function persistOutboundStatus(st: {
  id?: string;
  status?: string;
  errors?: { title?: string }[];
}): Promise<void> {
  const waMessageId = st.id?.trim();
  if (!waMessageId) return;

  const mappedStatus = st.status?.trim() || "unknown";
  await db.whatsAppMessage.updateMany({
    where: {
      waMessageId,
      direction: "outbound",
    },
    data: {
      status: mappedStatus,
      ...(mappedStatus === "failed"
        ? { errorDetail: st.errors?.[0]?.title?.slice(0, 500) || "Delivery failed" }
        : {}),
    },
  });
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
      const displayName = value?.contacts?.[0]?.profile?.name?.trim() || null;

      const statuses = value?.statuses;
      if (Array.isArray(statuses)) {
        for (const st of statuses) {
          await logWhatsAppDelivery({
            messageId: st.id,
            phone: st.recipient_id,
            status: st.status || "unknown",
            detail: st.errors?.[0]?.title,
          });
          try {
            await persistOutboundStatus(st);
          } catch (err) {
            console.error("[WHATSAPP INBOX] status update failed:", err);
          }
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
          try {
            await persistInboundMessage(msg, displayName);
          } catch (err) {
            console.error("[WHATSAPP INBOX] inbound persist failed:", err);
          }
        }
      }
    }
  }
}
