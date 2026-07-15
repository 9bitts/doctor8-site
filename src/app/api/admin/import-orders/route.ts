import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await db.importOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      product: { select: { name: true, slug: true, strengthMg: true } },
      distributor: { select: { tradeName: true, brandAlias: true } },
      patientUser: { select: { email: true } },
      documents: { select: { id: true, kind: true, fileName: true } },
      _count: { select: { documents: true, events: true } },
    },
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      quantity: o.quantity,
      treatmentDays: o.treatmentDays,
      productName: o.product.name,
      productSlug: o.product.slug,
      strengthMg: o.product.strengthMg,
      productUsdCents: o.productUsdCents,
      shippingUsdCents: o.shippingUsdCents,
      feePercent: o.feePercent,
      feeBrlCents: o.feeBrlCents,
      shipName: o.shipName,
      shipCity: o.shipCity,
      shipState: o.shipState,
      patientEmail: o.patientUser.email,
      distributorName: o.distributor?.tradeName ?? null,
      brandAlias: o.distributor?.brandAlias ?? null,
      anvisaAuthorizationNumber: o.anvisaAuthorizationNumber,
      trackingNumber: o.trackingNumber,
      documentCount: o._count.documents,
      documents: o.documents,
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt?.toISOString() ?? null,
    })),
  });
}
