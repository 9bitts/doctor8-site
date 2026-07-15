import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDistributorMembership } from "@/lib/distributor-auth";
import { DISTRIBUTOR_VISIBLE_STATUSES } from "@/lib/import-order";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "DISTRIBUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getDistributorMembership(session.user.id);
  if (!membership) {
    return NextResponse.json({ error: "No distributor membership" }, { status: 403 });
  }

  const orders = await db.importOrder.findMany({
    where: {
      distributorId: membership.distributorId,
      status: { in: DISTRIBUTOR_VISIBLE_STATUSES },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      product: { select: { name: true, strengthMg: true } },
    },
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      quantity: o.quantity,
      productName: o.product.name,
      strengthMg: o.product.strengthMg,
      shipName: o.shipName,
      shipLine1: o.shipLine1,
      shipLine2: o.shipLine2,
      shipCity: o.shipCity,
      shipState: o.shipState,
      shipZip: o.shipZip,
      shipCountry: o.shipCountry,
      shipPhone: o.shipPhone,
      anvisaAuthorizationNumber: o.anvisaAuthorizationNumber,
      trackingNumber: o.trackingNumber,
      courierName: o.courierName,
      paidAt: o.paidAt?.toISOString() ?? null,
      shippedAt: o.shippedAt?.toISOString() ?? null,
      createdAt: o.createdAt.toISOString(),
    })),
  });
}
