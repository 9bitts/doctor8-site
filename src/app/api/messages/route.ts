// src/app/api/messages/route.ts
// Real-time-like messaging between patient and professional
// Uses polling (client fetches every 5 seconds) — simple and reliable

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { z } from "zod";

const sendSchema = z.object({
  receiverId: z.string(),
  content: z.string().min(1).max(2000),
});

// GET — fetch conversation with a specific user
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
      include: { receiver: { select: { id: true, role: true, patientProfile: { select: { firstName: true, lastName: true, avatarUrl: true } }, professionalProfile: { select: { firstName: true, lastName: true, avatarUrl: true } } } } },
    });
    const received = await db.message.findMany({
      where: { receiverId: session.user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { sender: { select: { id: true, role: true, patientProfile: { select: { firstName: true, lastName: true, avatarUrl: true } }, professionalProfile: { select: { firstName: true, lastName: true, avatarUrl: true } } } } },
    });

    // Build unique conversations
    const convMap = new Map<string, { userId: string; name: string; lastMessage: string; lastAt: Date; unread: number }>();

    for (const m of sent) {
      const other = m.receiver;
      const name = other.role === "PATIENT"
        ? `${other.patientProfile?.firstName} ${other.patientProfile?.lastName}`
        : `Dr. ${other.professionalProfile?.firstName} ${other.professionalProfile?.lastName}`;
      if (!convMap.has(other.id) || convMap.get(other.id)!.lastAt < m.createdAt) {
        convMap.set(other.id, { userId: other.id, name, lastMessage: decrypt(m.content).substring(0, 60), lastAt: m.createdAt, unread: 0 });
      }
    }

    for (const m of received) {
      const other = m.sender;
      const name = other.role === "PATIENT"
        ? `${other.patientProfile?.firstName} ${other.patientProfile?.lastName}`
        : `Dr. ${other.professionalProfile?.firstName} ${other.professionalProfile?.lastName}`;
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

  // Fetch messages in a conversation
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

  // Mark received messages as read
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

  // Verify receiver exists
  const receiver = await db.user.findUnique({ where: { id: receiverId } });
  if (!receiver) return NextResponse.json({ error: "Recipient not found" }, { status: 404 });

  // Encrypt message content — may contain PHI
  const message = await db.message.create({
    data: {
      senderId: session.user.id,
      receiverId,
      content: encrypt(content),
    },
  });

  return NextResponse.json({
    ...message,
    content, // return plain text to sender
    isMine: true,
  }, { status: 201 });
}
