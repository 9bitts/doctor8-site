// Complete JIT queue entries (DONE) and reap abandoned IN_PROGRESS consults.

import { db } from "@/lib/db";

/** Daily ephemeral rooms last ~2h; anything still IN_PROGRESS past this is abandoned. */
export const JIT_IN_PROGRESS_STALE_MS = 2 * 60 * 60 * 1000;

async function runCompletionSideEffects(queueIds: string[]): Promise<void> {
  for (const id of queueIds) {
    try {
      const { tryStampForCompletedJitQueue } = await import("@/lib/club-stamps");
      await tryStampForCompletedJitQueue(id);
    } catch (e) {
      console.error("[JIT] Club stamp failed:", e);
    }
    try {
      const { settleEapCorporateJitQueue } = await import("@/lib/employer-eap-settlement");
      await settleEapCorporateJitQueue(id);
    } catch (e) {
      console.error("[JIT] EAP settlement failed:", e);
    }
  }
}

/** Mark queue rows DONE and run post-consult side effects. Returns ids that were updated. */
export async function markJitQueuesDone(
  where: { id?: string; sessionId?: string; ids?: string[] },
): Promise<string[]> {
  const now = new Date();
  const filter = {
    status: "IN_PROGRESS" as const,
    ...(where.id ? { id: where.id } : {}),
    ...(where.sessionId ? { sessionId: where.sessionId } : {}),
    ...(where.ids ? { id: { in: where.ids } } : {}),
  };

  const finishing = await db.jitQueue.findMany({
    where: filter,
    select: { id: true },
  });
  if (finishing.length === 0) return [];

  const ids = finishing.map((e) => e.id);
  await db.jitQueue.updateMany({
    where: { id: { in: ids }, status: "IN_PROGRESS" },
    data: { status: "DONE", endedAt: now },
  });
  await runCompletionSideEffects(ids);
  return ids;
}

/**
 * Patient left the video room (or explicitly ended an in-progress consult).
 * Also accepts CALLED in case they reached the room before enter flipped status.
 */
export async function patientEndJitConsultation(
  queueId: string,
  patientUserId: string,
): Promise<void> {
  const entry = await db.jitQueue.findUnique({
    where: { id: queueId },
    select: { id: true, patientUserId: true, status: true },
  });
  if (!entry || entry.patientUserId !== patientUserId) {
    throw new Error("Forbidden");
  }
  if (!["CALLED", "IN_PROGRESS"].includes(entry.status)) {
    return;
  }

  const now = new Date();
  const updated = await db.jitQueue.updateMany({
    where: {
      id: queueId,
      patientUserId,
      status: { in: ["CALLED", "IN_PROGRESS"] },
    },
    data: { status: "DONE", endedAt: now },
  });
  if (updated.count === 0) return;

  await runCompletionSideEffects([queueId]);
}

/** Professional explicitly left the JIT video room — end the consult. */
export async function professionalEndJitConsultation(
  queueId: string,
  professionalUserId: string,
): Promise<void> {
  const entry = await db.jitQueue.findUnique({
    where: { id: queueId },
    select: {
      id: true,
      status: true,
      session: { select: { professional: { select: { userId: true } } } },
    },
  });
  if (!entry || entry.session.professional.userId !== professionalUserId) {
    throw new Error("Forbidden");
  }
  if (!["CALLED", "IN_PROGRESS"].includes(entry.status)) {
    return;
  }

  const now = new Date();
  const updated = await db.jitQueue.updateMany({
    where: {
      id: queueId,
      status: { in: ["CALLED", "IN_PROGRESS"] },
      session: { professional: { userId: professionalUserId } },
    },
    data: { status: "DONE", endedAt: now },
  });
  if (updated.count === 0) return;

  await runCompletionSideEffects([queueId]);
}

/** Close IN_PROGRESS entries whose consult started long ago (abandoned / crashed). */
export async function expireStaleJitInProgress(sessionId?: string): Promise<number> {
  const cutoff = new Date(Date.now() - JIT_IN_PROGRESS_STALE_MS);
  const stale = await db.jitQueue.findMany({
    where: {
      status: "IN_PROGRESS",
      ...(sessionId ? { sessionId } : {}),
      OR: [
        { startedAt: { lt: cutoff } },
        { startedAt: null, calledAt: { lt: cutoff } },
        { startedAt: null, calledAt: null, enteredAt: { lt: cutoff } },
      ],
    },
    select: { id: true },
  });
  if (stale.length === 0) return 0;
  await markJitQueuesDone({ ids: stale.map((e) => e.id) });
  return stale.length;
}

/** When plantão sessions go OFFLINE, any leftover IN_PROGRESS consult is over. */
export async function completeInProgressForSessions(sessionIds: string[]): Promise<number> {
  if (sessionIds.length === 0) return 0;
  const finishing = await db.jitQueue.findMany({
    where: { sessionId: { in: sessionIds }, status: "IN_PROGRESS" },
    select: { id: true },
  });
  if (finishing.length === 0) return 0;
  await markJitQueuesDone({ ids: finishing.map((e) => e.id) });
  return finishing.length;
}

/**
 * Clear a patient's abandoned IN_PROGRESS rows before rendering the home banner:
 * expire dead plantões (and their leftover consults), reap 2h-stale rows, then
 * close any remaining IN_PROGRESS tied to an OFFLINE session.
 */
export async function reconcilePatientJitInProgress(patientUserId: string): Promise<void> {
  const { expireStaleJitSessions } = await import("@/lib/jit-session-lifecycle");
  await expireStaleJitSessions();
  await expireStaleJitInProgress();

  const orphaned = await db.jitQueue.findMany({
    where: {
      patientUserId,
      status: "IN_PROGRESS",
      session: { status: "OFFLINE" },
    },
    select: { id: true },
  });
  if (orphaned.length === 0) return;
  await markJitQueuesDone({ ids: orphaned.map((e) => e.id) });
}
