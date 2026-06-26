import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { assignNextInPool } from "@/lib/humanitarian/dispatcher";

const schema = z.object({ entryId: z.string() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const entry = await db.humanitarianQueueEntry.findUnique({
    where: { id: parsed.data.entryId },
    include: { pool: true },
  });
  if (!entry || entry.patientUserId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!["WAITING", "CALLED"].includes(entry.status)) {
    return NextResponse.json({ error: "Cannot cancel" }, { status: 400 });
  }

  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.humanitarianQueueEntry.update({
      where: { id: entry.id },
      data: { status: "CANCELLED", endedAt: now },
    });
    if (entry.volunteerId) {
      await tx.humanitarianVolunteer.update({
        where: { id: entry.volunteerId },
        data: { status: "ONLINE", currentEntryId: null },
      });
    }
  });

  await assignNextInPool(entry.poolId);
  return NextResponse.json({ success: true });
}
