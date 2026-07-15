import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDistributorMembership } from "@/lib/distributor-auth";
import { DISTRIBUTOR_VISIBLE_STATUSES, recordImportOrderEvent } from "@/lib/import-order";

const patchSchema = z.object({
  action: z.enum(["mark_shipped", "mark_delivered"]),
  courierName: z.string().max(80).optional(),
  trackingNumber: z.string().max(120).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DISTRIBUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getDistributorMembership(session.user.id);
  if (!membership || membership.distributor.status !== "ACTIVE") {
    return NextResponse.json({ error: "Distributor not active" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const order = await db.importOrder.findFirst({
    where: {
      id,
      distributorId: membership.distributorId,
      status: { in: DISTRIBUTOR_VISIBLE_STATUSES },
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (parsed.data.action === "mark_shipped") {
    if (!["PAID", "READY_TO_SHIP"].includes(order.status)) {
      return NextResponse.json({ error: "Order not ready to ship" }, { status: 400 });
    }
    if (!parsed.data.trackingNumber?.trim()) {
      return NextResponse.json({ error: { trackingNumber: ["Required"] } }, { status: 400 });
    }
    const updated = await db.importOrder.update({
      where: { id },
      data: {
        status: "SHIPPED",
        trackingNumber: parsed.data.trackingNumber.trim(),
        courierName: parsed.data.courierName?.trim() || null,
        shippedAt: new Date(),
      },
    });
    await recordImportOrderEvent({
      orderId: id,
      fromStatus: order.status,
      toStatus: "SHIPPED",
      note: `Tracking ${updated.trackingNumber}`,
      actorUserId: session.user.id,
    });
    const { notifyImportOrderTransition } = await import("@/lib/import-order-notify");
    notifyImportOrderTransition(id, order.status, "SHIPPED").catch((e) =>
      console.error("[IMPORT ORDER NOTIFY]", e),
    );
    return NextResponse.json({ order: updated });
  }

  if (order.status !== "SHIPPED") {
    return NextResponse.json({ error: "Order not shipped" }, { status: 400 });
  }
  const updated = await db.importOrder.update({
    where: { id },
    data: { status: "DELIVERED", deliveredAt: new Date() },
  });
  await recordImportOrderEvent({
    orderId: id,
    fromStatus: order.status,
    toStatus: "DELIVERED",
    actorUserId: session.user.id,
  });
  const { notifyImportOrderTransition } = await import("@/lib/import-order-notify");
  notifyImportOrderTransition(id, order.status, "DELIVERED").catch((e) =>
    console.error("[IMPORT ORDER NOTIFY]", e),
  );
  return NextResponse.json({ order: updated });
}
