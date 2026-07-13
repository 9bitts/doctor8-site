import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin";
import {
  loadWhatsAppConversationRowByWaPhone,
  toWhatsAppConversationRowDto,
} from "@/lib/admin/whatsapp-conversation-dto";
import { findPatientProfileIdByWaPhone } from "@/lib/admin/whatsapp-patient-link";
import { createAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp";
import { AuditAction } from "@prisma/client";

const bodySchema = z.object({
  phone: z.string().min(8),
  displayName: z.string().trim().optional(),
  patientProfileId: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const waPhone = normalizeWhatsAppPhone(parsed.data.phone);
  if (!waPhone) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const existing = await loadWhatsAppConversationRowByWaPhone(waPhone);
  if (existing) {
    const updates: {
      displayName?: string;
      patientProfileId?: string;
    } = {};

    if (parsed.data.displayName && !existing.displayName) {
      updates.displayName = parsed.data.displayName;
    }
    if (parsed.data.patientProfileId && !existing.patientProfileId) {
      updates.patientProfileId = parsed.data.patientProfileId;
    }

    if (Object.keys(updates).length > 0) {
      await db.whatsAppConversation.update({
        where: { id: existing.id },
        data: updates,
      });
    }

    const conversation = await loadWhatsAppConversationRowByWaPhone(waPhone);
    await createAuditLog({
      userId: session.user.id!,
      action: AuditAction.VIEW_RECORD,
      resource: "WhatsAppConversation",
      resourceId: conversation!.id,
      details: { action: "whatsapp_open_by_phone", created: false },
    });

    return NextResponse.json({ conversation, created: false });
  }

  let patientProfileId = parsed.data.patientProfileId ?? null;
  if (!patientProfileId) {
    patientProfileId = await findPatientProfileIdByWaPhone(waPhone);
  }

  const now = new Date();
  const created = await db.whatsAppConversation.create({
    data: {
      waPhone,
      displayName: parsed.data.displayName?.trim() || null,
      patientProfileId,
      status: "open",
      lastMessageAt: now,
      unreadCount: 0,
    },
    select: {
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
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          body: true,
          type: true,
          direction: true,
          createdAt: true,
        },
      },
    },
  });

  const conversation = await toWhatsAppConversationRowDto(created);

  await createAuditLog({
    userId: session.user.id!,
    action: AuditAction.CREATE_RECORD,
    resource: "WhatsAppConversation",
    resourceId: conversation.id,
    details: { action: "whatsapp_open_by_phone", created: true },
  });

  return NextResponse.json({ conversation, created: true });
}
