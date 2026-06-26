// src/lib/subscription.ts
// Club Doctor subscription helpers.

import { db } from "@/lib/db";

export function isActiveStatus(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

export async function hasActiveClub(userId: string): Promise<boolean> {
  const sub = await db.subscription.findUnique({ where: { userId } });
  if (!sub) return false;
  if (!isActiveStatus(sub.status)) return false;
  if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() < Date.now()) return false;
  return true;
}
