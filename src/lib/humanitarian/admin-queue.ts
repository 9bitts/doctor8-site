import { db } from "@/lib/db";
import { assignNextInPool } from "@/lib/humanitarian/dispatcher";
import type { HumanitarianPriority } from "@prisma/client";

const PRIORITY_SORT: HumanitarianPriority[] = ["CRISIS", "URGENT", "ROUTINE"];

export async function adminRemoveFromQueue(
  entryId: string,
  adminUserId: string,
  reason: string,
): Promise<{ poolId: string } | null> {
  const entry = await db.humanitarianQueueEntry.findUnique({
    where: { id: entryId },
    select: { id: true, status: true, poolId: true, volunteerId: true },
  });
  if (!entry) return null;
  if (!["WAITING", "CALLED"].includes(entry.status)) return null;

  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.humanitarianQueueEntry.update({
      where: { id: entry.id },
      data: {
        status: "CANCELLED",
        endedAt: now,
        adminRemovedById: adminUserId,
        adminRemovedAt: now,
        adminRemovalReason: reason,
      },
    });
    if (entry.volunteerId) {
      await tx.humanitarianVolunteer.update({
        where: { id: entry.volunteerId },
        data: { status: "ONLINE", currentEntryId: null },
      });
    }
  });

  await assignNextInPool(entry.poolId);
  return { poolId: entry.poolId };
}

export async function adminRepositionInQueue(
  entryId: string,
  targetPosition: number,
): Promise<boolean> {
  const entry = await db.humanitarianQueueEntry.findUnique({
    where: { id: entryId },
    select: { id: true, poolId: true, status: true, priority: true, position: true },
  });
  if (!entry || entry.status !== "WAITING") return false;
  if (targetPosition < 1) return false;

  const waiting = await db.humanitarianQueueEntry.findMany({
    where: { poolId: entry.poolId, status: "WAITING" },
    orderBy: [{ priority: "desc" }, { position: "asc" }],
    select: { id: true, priority: true, position: true },
  });

  const sorted = [...waiting].sort((a, b) => {
    const pa = PRIORITY_SORT.indexOf(a.priority);
    const pb = PRIORITY_SORT.indexOf(b.priority);
    if (pa !== pb) return pa - pb;
    return a.position - b.position;
  });

  const idx = sorted.findIndex((e) => e.id === entryId);
  if (idx < 0) return false;

  const reordered = sorted.filter((e) => e.id !== entryId);
  const insertAt = Math.min(Math.max(targetPosition - 1, 0), reordered.length);
  reordered.splice(insertAt, 0, sorted[idx]);

  await db.$transaction(
    reordered.map((e, i) =>
      db.humanitarianQueueEntry.update({
        where: { id: e.id },
        data: { position: i + 1 },
      }),
    ),
  );

  return true;
}
