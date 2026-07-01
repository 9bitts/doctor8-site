import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({ entryId: z.string() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const entry = await db.humanitarianQueueEntry.findUnique({
    where: { id: parsed.data.entryId },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (entry.patientUserId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (entry.status === "NO_SHOW" || (entry.expiresAt && entry.expiresAt < new Date())) {
    return NextResponse.json({ error: "Expired" }, { status: 410 });
  }
  if (entry.status !== "CALLED") {
    return NextResponse.json({ error: "Not your turn yet" }, { status: 400 });
  }

  const updated = await db.humanitarianQueueEntry.updateMany({
    where: { id: entry.id, status: "CALLED" },
    data: { status: "IN_PROGRESS", startedAt: new Date() },
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "Not your turn yet" }, { status: 409 });
  }

  const refreshed = await db.humanitarianQueueEntry.findUnique({
    where: { id: entry.id },
    select: { meetingUrl: true, status: true, id: true },
  });
  if (!refreshed) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    meetingUrl: refreshed.meetingUrl,
    status: refreshed.status,
    entryId: refreshed.id,
  });
}
