// src/app/api/jit/queue/enter/route.ts
// POST — patient confirms entry (clicks "Entrar na consulta")
// Changes status from CALLED → IN_PROGRESS

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ queueId: z.string() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const entry = await db.jitQueue.findUnique({ where: { id: parsed.data.queueId } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (entry.patientUserId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Check not expired
  if (entry.status === "NO_SHOW" || (entry.expiresAt && entry.expiresAt < new Date()))
    return NextResponse.json({ error: "Expired — you missed your turn." }, { status: 410 });

  if (entry.status !== "CALLED")
    return NextResponse.json({ error: "Not your turn yet." }, { status: 400 });

  const updated = await db.jitQueue.update({
    where: { id: entry.id },
    data:  { status: "IN_PROGRESS", startedAt: new Date() },
  });

  return NextResponse.json({
    meetingUrl: updated.meetingUrl,
    status:     updated.status,
  });
}
