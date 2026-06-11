// src/lib/subscription.ts
// Club Doctor subscription helpers.
// Single source of truth for "is this patient an active Club member?"
// and for the consultation discount.

import { db } from "@/lib/db";

// Club Doctor gives this discount on every consultation.
export const CLUB_DISCOUNT_RATE = 0.20; // 20%

// A subscription counts as active if Stripe says "active" or "trialing".
// (past_due / cancelled / unpaid do NOT grant the benefit.)
export function isActiveStatus(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

// Returns true if the given user currently has an active Club Doctor subscription.
export async function hasActiveClub(userId: string): Promise<boolean> {
  const sub = await db.subscription.findUnique({ where: { userId } });
  if (!sub) return false;
  if (!isActiveStatus(sub.status)) return false;
  // If it is set to cancel at period end, it is still active until the period actually ends.
  if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() < Date.now()) return false;
  return true;
}

// Applies the Club discount to a price in cents, if the member is active.
// Returns the final amount in cents (integer) and whether the discount was applied.
export function applyClubDiscount(
  amountCents: number,
  isMember: boolean
): { finalAmount: number; discountApplied: boolean; originalAmount: number } {
  if (!isMember) {
    return { finalAmount: amountCents, discountApplied: false, originalAmount: amountCents };
  }
  const finalAmount = Math.round(amountCents * (1 - CLUB_DISCOUNT_RATE));
  return { finalAmount, discountApplied: true, originalAmount: amountCents };
}
