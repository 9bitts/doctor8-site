import { isWithinWhatsApp24hWindow, messagePreview } from "@/lib/admin/whatsapp-inbox";
import { loadPatientNamesByIds } from "@/lib/admin/whatsapp-patient-link";
import { db } from "@/lib/db";
import { formatPhoneDisplay } from "@/lib/phone";

type ConversationWithLastMessage = {
  id: string;
  waPhone: string;
  displayName: string | null;
  status: string;
  unreadCount: number;
  lastMessageAt: Date;
  lastInboundAt: Date | null;
  assignedToUserId: string | null;
  patientProfileId: string | null;
  messages: Array<{
    body: string | null;
    type: string;
    direction: string;
    createdAt: Date;
  }>;
};

export type WhatsAppConversationRowDto = {
  id: string;
  waPhone: string;
  waPhoneDisplay: string;
  displayName: string | null;
  status: string;
  unreadCount: number;
  lastMessageAt: string;
  lastInboundAt: string | null;
  within24hWindow: boolean;
  assignedToUserId: string | null;
  assignedToName: string | null;
  patientProfileId: string | null;
  patientName: string | null;
  hasInboundHistory: boolean;
  lastMessage: {
    body: string;
    type: string;
    direction: string;
    createdAt: string;
  } | null;
};

export async function toWhatsAppConversationRowDto(
  row: ConversationWithLastMessage,
  assigneeMap?: Map<string, string | null>,
  patientNames?: Map<string, string>,
): Promise<WhatsAppConversationRowDto> {
  let names = patientNames;
  if (!names && row.patientProfileId) {
    names = await loadPatientNamesByIds([row.patientProfileId]);
  }

  let assignees = assigneeMap;
  if (!assignees && row.assignedToUserId) {
    const user = await db.user.findUnique({
      where: { id: row.assignedToUserId },
      select: { id: true, email: true },
    });
    assignees = new Map(user ? [[user.id, user.email]] : []);
  }

  const last = row.messages[0] ?? null;
  const patientName = row.patientProfileId
    ? names?.get(row.patientProfileId) ?? null
    : null;

  return {
    id: row.id,
    waPhone: row.waPhone,
    waPhoneDisplay: formatPhoneDisplay(row.waPhone),
    displayName: row.displayName,
    status: row.status,
    unreadCount: row.unreadCount,
    lastMessageAt: row.lastMessageAt.toISOString(),
    lastInboundAt: row.lastInboundAt?.toISOString() ?? null,
    within24hWindow: isWithinWhatsApp24hWindow(row.lastInboundAt),
    assignedToUserId: row.assignedToUserId,
    assignedToName: row.assignedToUserId
      ? assignees?.get(row.assignedToUserId) ?? null
      : null,
    patientProfileId: row.patientProfileId,
    patientName,
    hasInboundHistory: Boolean(row.lastInboundAt),
    lastMessage: last
      ? {
          body: messagePreview(last.body, last.type),
          type: last.type,
          direction: last.direction,
          createdAt: last.createdAt.toISOString(),
        }
      : null,
  };
}

const conversationSelect = {
  id: true,
  waPhone: true,
  displayName: true,
  status: true,
  unreadCount: true,
  lastMessageAt: true,
  lastInboundAt: true,
  assignedToUserId: true,
  patientProfileId: true,
  messages: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: {
      body: true,
      type: true,
      direction: true,
      createdAt: true,
    },
  },
};

export async function loadWhatsAppConversationRowById(
  id: string,
): Promise<WhatsAppConversationRowDto | null> {
  const row = await db.whatsAppConversation.findUnique({
    where: { id },
    select: conversationSelect,
  });
  if (!row) return null;
  return toWhatsAppConversationRowDto(row);
}

export async function loadWhatsAppConversationRowByWaPhone(
  waPhone: string,
): Promise<WhatsAppConversationRowDto | null> {
  const row = await db.whatsAppConversation.findUnique({
    where: { waPhone },
    select: conversationSelect,
  });
  if (!row) return null;
  return toWhatsAppConversationRowDto(row);
}
