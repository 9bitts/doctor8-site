import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { mapOwnerVerificationFields } from "@/lib/b2b-admin";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const distributors = await db.distributor.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      ein: true,
      legalName: true,
      tradeName: true,
      brandAlias: true,
      slug: true,
      status: true,
      platformFeePercent: true,
      addressCity: true,
      addressState: true,
      addressCountry: true,
      contactEmail: true,
      contactPhone: true,
      stripeConnectAccountId: true,
      createdAt: true,
      members: {
        where: { role: "OWNER" },
        take: 1,
        select: {
          user: {
            select: {
              id: true,
              email: true,
              emailVerified: true,
              phoneVerified: true,
              lockedUntil: true,
            },
          },
        },
      },
      _count: {
        select: { members: true },
      },
    },
  });

  return NextResponse.json({
    distributors: distributors.map((d) => {
      const owner = d.members[0]?.user;
      return {
        id: d.id,
        ein: d.ein,
        legalName: d.legalName,
        tradeName: d.tradeName,
        brandAlias: d.brandAlias,
        slug: d.slug,
        status: d.status,
        platformFeePercent: d.platformFeePercent,
        addressCity: d.addressCity,
        addressState: d.addressState,
        addressCountry: d.addressCountry,
        contactEmail: d.contactEmail,
        contactPhone: d.contactPhone,
        stripeConnected: Boolean(d.stripeConnectAccountId),
        memberCount: d._count.members,
        ...mapOwnerVerificationFields(owner, d.contactEmail),
        createdAt: d.createdAt.toISOString(),
      };
    }),
  });
}
