import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin";
import { isWithinWhatsApp24hWindow } from "@/lib/admin/whatsapp-inbox";
import { audit, createAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { AuditAction } from "@prisma/client";

const DEFAULT_LIMIT = 50;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const conversation = await db.whatsAppConversation.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sp = req.nextUrl.searchParams;
  const cursor = sp.get("cursor")?.trim() || "";
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") || DEFAULT_LIMIT)));

  const rows = await db.whatsAppMessage.findMany({
    where: {
      conversationId: params.id,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    select: {
      id: true,
      direction: true,
      type: true,
      body: true,
      mediaId: true,
      status: true,
      errorDetail: true,
      sentByName: true,
      createdAt: true,
    },
  });

  const hasMore = rows.length > limit;
  const messages = (hasMore ? rows.slice(0, limit) : rows)
    .reverse()
    .map((m) => ({
      id: m.id,
      direction: m.direction,
      type: m.type,
      body: m.body,
      mediaId: m.mediaId,
      status: m.status,
      errorDetail: m.errorDetail,
      sentByName: m.sentByName,
      createdAt: m.createdAt.toISOString(),
    }));

  await db.whatsAppConversation.update({
    where: { id: params.id },
    data: { unreadCount: 0 },
  });

  await audit.viewRecord(session.user.id!, "WhatsAppConversation", params.id);

  return NextResponse.json({
    messages,
    hasMore,
    nextCursor: hasMore ? rows[limit - 1]?.createdAt.toISOString() : null,
  });
}

const sendSchema = z.object({
  text: z.string().min(1).max(4096),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const conversation = await db.whatsAppConversation.findUnique({
    where: { id: params.id },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isWithinWhatsApp24hWindow(conversation.lastInboundAt)) {
    return NextResponse.json(
      { error: "outside_24h_window", code: "outside_24h_window" },
      { status: 422 },
    );
  }

  const sentByName =
    session.user.name?.trim() || session.user.email?.trim() || "Admin";
  const result = await sendWhatsAppText({
    toPhone: conversation.waPhone,
    body: parsed.data.text,
  });

  const now = new Date();
  const message = await db.whatsAppMessage.create({
    data: {
      conversationId: conversation.id,
      direction: "outbound",
      type: "text",
      body: parsed.data.text.trim(),
      waMessageId: result.waMessageId ?? null,
      status: result.ok ? "sent" : "failed",
      errorDetail: result.ok ? null : result.error?.slice(0, 500) ?? "Send failed",
      sentByUserId: session.user.id!,
      sentByName,
    },
    select: {
      id: true,
      direction: true,
      type: true,
      body: true,
      status: true,
      errorDetail: true,
      sentByName: true,
      createdAt: true,
    },
  });

  await db.whatsAppConversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: now },
  });

  await createAuditLog({
    userId: session.user.id!,
    action: AuditAction.CREATE_RECORD,
    resource: "WhatsAppMessage",
    resourceId: message.id,
    details: {
      action: "whatsapp_send",
      conversationId: conversation.id,
      ok: result.ok,
    },
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error || "Send failed",
        message: {
          id: message.id,
          direction: message.direction,
          type: message.type,
          body: message.body,
          status: message.status,
          errorDetail: message.errorDetail,
          sentByName: message.sentByName,
          createdAt: message.createdAt.toISOString(),
        },
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    message: {
      id: message.id,
      direction: message.direction,
      type: message.type,
      body: message.body,
      status: message.status,
      errorDetail: message.errorDetail,
      sentByName: message.sentByName,
      createdAt: message.createdAt.toISOString(),
    },
  });
}
