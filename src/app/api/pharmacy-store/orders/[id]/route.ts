import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePharmacyStore } from "@/lib/pharmacy-store-auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const ctx = await requirePharmacyStore();
  if ("error" in ctx) return ctx.error;

  const status = req.nextUrl.searchParams.get("status");
  const orders = await db.pharmacyOrder.findMany({
    where: {
      pharmacyStoreId: ctx.pharmacyStoreId,
      ...(status ? { status: status as never } : {}),
    },
    include: {
      items: true,
      prescription: {
        select: { id: true, signatureStatus: true, validUntil: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ orders });
}

const patchSchema = z.object({
  status: z.enum(["CONFIRMED", "PREPARING", "READY", "COMPLETED", "CANCELLED"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requirePharmacyStore();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const order = await db.pharmacyOrder.findFirst({
    where: { id, pharmacyStoreId: ctx.pharmacyStoreId },
  });
  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  const now = new Date();
  const timestamps: Record<string, Date> = {};
  if (parsed.data.status === "CONFIRMED") timestamps.confirmedAt = now;
  if (parsed.data.status === "READY") timestamps.readyAt = now;
  if (parsed.data.status === "COMPLETED") timestamps.completedAt = now;
  if (parsed.data.status === "CANCELLED") timestamps.cancelledAt = now;

  const updated = await db.pharmacyOrder.update({
    where: { id },
    data: { status: parsed.data.status, ...timestamps },
    include: { items: true },
  });

  const { notifyPharmacyOrderStatusChanged } = await import("@/lib/pharmacy-order-notify");
  notifyPharmacyOrderStatusChanged(updated.id, parsed.data.status).catch((e) =>
    console.error("[PHARMACY ORDER STATUS NOTIFY]", e),
  );

  return NextResponse.json({ order: updated });
}
