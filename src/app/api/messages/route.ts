// src/app/api/messages/route.ts
// Real-time-like messaging between patient and professional.
// Uses polling (client fetches every 5 seconds) — simple and reliable.
// On send, also creates a bell notification for the receiver.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import { z } from "zod";

const sendSchema = z.object({
  receiverId: z.string(),
  content: z.string().min(1).max(2000),
});

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

function displayName(u: {
  role?: string;
  patientProfile?: { firstName?: string | null; lastName?: string | null } | null;
  professionalProfile?: { firstName?: string | null; lastName?: string | null } | null;
  psychoanalystProfile?: { firstName?: string | null; lastName?: string | null } | null;
  integrativeTherapistProfile?: { firstName?: string | null; lastName?: string | null } | null;
} | null): string {
  if (!u) return "Someone";
  if (u.role === "PATIENT") {
    const first = safeDecrypt(u.patientProfile?.firstName);
    const last = safeDecrypt(u.patientProfile?.lastName);
    return `${first} ${last}`.trim() || "Patient";
  }
  if (u.role === "PSYCHOANALYST" && u.psychoanalystProfile) {
    const first = safeDecrypt(u.psychoanalystProfile.firstName);
    const last = safeDecrypt(u.psychoanalystProfile.lastName);
    return `${first} ${last}`.trim() || "Psychoanalyst";
  }
  if (u.role === "INTEGRATIVE_THERAPIST" && u.integrativeTherapistProfile) {
    const first = safeDecrypt(u.integrativeTherapistProfile.firstName);
    const last = safeDecrypt(u.integrativeTherapistProfile.lastName);
    return `${first} ${last}`.trim() || "Therapist";
  }
  const first = u.professionalProfile?.firstName ?? "";
  const last = u.professionalProfile?.lastName ?? "";
  return `Dr. ${first} ${last}`.trim() || "Professional";
}

// GET — fetch conversation with a specific user, or list all conversations
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const withUserId = searchParams.get("with");
  const since = searchParams.get("since"); // ISO timestamp for polling

  if (!withUserId) {
    // List all conversations (last message per contact)
    const sent = await db.message.findMany({
      where: { senderId: session.user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { receiver: { select: { id: true, role: true, patientProfile: { select: { firstName: true, lastName: true, avatarUrl: true } }, professionalProfile: { select: { firstName: true, lastName: true, avatarUrl: true } }, psychoanalystProfile: { select: { firstName: true, lastName: true } }, integrativeTherapistProfile: { select: { firstName: true, lastName: true } } } } },
    });
    const received = await db.message.findMany({
      where: { receiverId: session.user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { sender: { select: { id: true, role: true, patientProfile: { select: { firstName: true, lastName: true, avatarUrl: true } }, professionalProfile: { select: { firstName: true, lastName: true, avatarUrl: true } }, psychoanalystProfile: { select: { firstName: true, lastName: true } }, integrativeTherapistProfile: { select: { firstName: true, lastName: true } } } } },
    });

    const convMap = new Map<string, { userId: string; name: string; lastMessage: string; lastAt: Date; unread: number }>();

    for (const m of sent) {
      const other = m.receiver;
      const name = displayName(other);
      if (!convMap.has(other.id) || convMap.get(other.id)!.lastAt < m.createdAt) {
        convMap.set(other.id, { userId: other.id, name, lastMessage: decrypt(m.content).substring(0, 60), lastAt: m.createdAt, unread: 0 });
      }
    }

    for (const m of received) {
      const other = m.sender;
      const name = displayName(other);
      const existing = convMap.get(other.id);
      const unread = !m.readAt ? 1 : 0;
      if (!existing || existing.lastAt < m.createdAt) {
        convMap.set(other.id, { userId: other.id, name, lastMessage: decrypt(m.content).substring(0, 60), lastAt: m.createdAt, unread: (existing?.unread || 0) + unread });
      } else if (unread) {
        existing.unread = (existing.unread || 0) + 1;
      }
    }

    return NextResponse.json({ conversations: Array.from(convMap.values()).sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime()) });
  }

  const messages = await db.message.findMany({
    where: {
      OR: [
        { senderId: session.user.id, receiverId: withUserId },
        { senderId: withUserId, receiverId: session.user.id },
      ],
      deletedAt: null,
      ...(since ? { createdAt: { gt: new Date(since) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  await db.message.updateMany({
    where: { senderId: withUserId, receiverId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  const decrypted = messages.map((m) => ({
    ...m,
    content: decrypt(m.content),
    isMine: m.senderId === session.user.id,
  }));

  return NextResponse.json({ messages: decrypted });
}

// POST — send a message
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { receiverId, content } = parsed.data;

  if (receiverId === session.user.id) {
    return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
  }

  const receiver = await db.user.findUnique({
    where: { id: receiverId },
    select: { id: true, role: true },
  });
  if (!receiver) return NextResponse.json({ error: "Recipient not found" }, { status: 404 });

  if (session.user.role === "PATIENT" && receiver.role === "PATIENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const message = await db.message.create({
    data: {
      senderId: session.user.id,
      receiverId,
      content: encrypt(content),
    },
  });

  // Create a bell notification for the receiver.
  const sender = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      patientProfile: { select: { firstName: true, lastName: true } },
      professionalProfile: { select: { firstName: true, lastName: true } },
      psychoanalystProfile: { select: { firstName: true, lastName: true } },
      integrativeTherapistProfile: { select: { firstName: true, lastName: true } },
    },
  });
  const senderName = displayName(sender);
  const messageCopy = storedNotificationText("notif.message.title", "notif.message.body", {
    name: senderName,
  });
  await createNotification({
    userId: receiverId,
    title: messageCopy.title,
    body: messageCopy.body,
    type: "message",
    data: {
      fromUserId: session.user.id,
      titleKey: "notif.message.title",
      bodyKey: "notif.message.body",
      bodyParams: { name: senderName },
    },
  });

  return NextResponse.json({
    ...message,
    content,
    isMine: true,
  }, { status: 201 });
}
