import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import type { User } from "@prisma/client";

export const DELETION_GRACE_DAYS = 30;

export type DeletedAccountResolution = {
  blocked: boolean;
  reactivated: boolean;
};

type UserDeletionFields = Pick<User, "id" | "deletedAt" | "deletionScheduledAt">;

export function deletionScheduledDate(from: Date = new Date()): Date {
  const scheduled = new Date(from);
  scheduled.setDate(scheduled.getDate() + DELETION_GRACE_DAYS);
  return scheduled;
}

export async function resolveDeletedAccountOnLogin(
  user: UserDeletionFields,
): Promise<DeletedAccountResolution> {
  if (!user.deletedAt) {
    return { blocked: false, reactivated: false };
  }

  const now = new Date();
  const stillInGracePeriod =
    user.deletionScheduledAt !== null && user.deletionScheduledAt > now;

  if (stillInGracePeriod) {
    await db.user.update({
      where: { id: user.id },
      data: {
        deletedAt: null,
        deletionScheduledAt: null,
      },
    });
    await audit.accountReactivated(user.id);
    return { blocked: false, reactivated: true };
  }

  return { blocked: true, reactivated: false };
}
