import { db } from "@/lib/db";

export async function getWorkforceMembershipForUser(userId: string, email: string) {
  const normalizedEmail = email.toLowerCase();
  return db.employerWorkforceMember.findFirst({
    where: {
      status: "ACTIVE",
      OR: [{ userId }, { email: normalizedEmail }],
    },
    include: {
      employerCompany: {
        select: {
          id: true,
          nomeFantasia: true,
          slug: true,
        },
      },
    },
  });
}

export async function linkWorkforceMemberToUser(workforceId: string, userId: string) {
  return db.employerWorkforceMember.update({
    where: { id: workforceId },
    data: {
      userId,
      status: "ACTIVE",
      activatedAt: new Date(),
    },
  });
}

export function resolveWorkforceSessionQuota(
  memberQuota: number | null | undefined,
  companyDefault: number,
): number {
  if (typeof memberQuota === "number" && memberQuota >= 0) return memberQuota;
  return companyDefault;
}

export function workforceSessionsRemaining(
  quota: number,
  used: number,
): number {
  return Math.max(0, quota - used);
}
