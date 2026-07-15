import { db } from "@/lib/db";

export async function getDistributorMembership(userId: string) {
  return db.distributorMember.findFirst({
    where: { userId, status: "ACTIVE" },
    include: {
      distributor: {
        select: {
          id: true,
          legalName: true,
          tradeName: true,
          slug: true,
          status: true,
          platformFeePercent: true,
          brandAlias: true,
          ein: true,
          addressCountry: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });
}

export function isDistributorActive(status: string | null | undefined): boolean {
  return status === "ACTIVE";
}

export function canAccessDistributorPortal(role: string | null | undefined): boolean {
  return role === "DISTRIBUTOR" || role === "ADMIN";
}
