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
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const entry = await db.jitQueue.findUnique({
    where: { id: parsed.data.queueId },
    select: { id: true, patientUserId: true, status: true },
  });

  if (!entry || entry.patientUserId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!["WAITING", "CALLED"].includes(entry.status)) {
    return NextResponse.json({ error: "Cannot cancel" }, { status: 400 });
  }

  await db.jitQueue.update({
    where: { id: entry.id },
    data: { status: "CANCELLED", endedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
