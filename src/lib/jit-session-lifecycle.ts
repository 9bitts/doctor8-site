// JIT plant?o lifecycle ? heartbeat, logout cleanup, stale session expiry.

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

const DEFAULT_HEARTBEAT_SECONDS = 900; // 15 min ? aligned with SESSION_MAX_AGE_SECONDS

export function getJitHeartbeatTimeoutSeconds(): number {
  return parseInt(process.env.JIT_HEARTBEAT_TIMEOUT_SECONDS || String(DEFAULT_HEARTBEAT_SECONDS), 10);
}

export function getJitHeartbeatCutoff(): Date {
  return new Date(Date.now() - getJitHeartbeatTimeoutSeconds() * 1000);
}

/** Prisma filter for JIT sessions that are genuinely active (recent heartbeat). */
export function activeOnlineJitSessionWhere(): Prisma.JitSessionWhereInput {
  const cutoff = getJitHeartbeatCutoff();
  return {
    status: "ONLINE",
    OR: [
      { lastHeartbeatAt: { gte: cutoff } },
      { lastHeartbeatAt: null, updatedAt: { gte: cutoff } },
    ],
  };
}

export async function closeJitSessionsForUser(userId: string): Promise<number> {
  const professional = await db.professionalProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!professional) return 0;

  const result = await db.jitSession.updateMany({
    where: { professionalId: professional.id, status: { in: ["ONLINE", "PAUSED"] } },
    data: { status: "OFFLINE" },
  });
  return result.count;
}

export async function touchJitHeartbeat(professionalId: string): Promise<boolean> {
  const now = new Date();
  const result = await db.jitSession.updateMany({
    where: { professionalId, status: { in: ["ONLINE", "PAUSED"] } },
    data: { lastHeartbeatAt: now },
  });
  return result.count > 0;
}

/** Mark ONLINE/PAUSED sessions without recent activity as OFFLINE. */
export async function expireStaleJitSessions(): Promise<number> {
  const cutoff = getJitHeartbeatCutoff();
  const result = await db.jitSession.updateMany({
    where: {
      status: { in: ["ONLINE", "PAUSED"] },
      OR: [
        { lastHeartbeatAt: { lt: cutoff } },
        { lastHeartbeatAt: null, updatedAt: { lt: cutoff } },
      ],
    },
    data: { status: "OFFLINE" },
  });
  return result.count;
}
