import { NextResponse } from "next/server";
import { requirePharmacyStore } from "@/lib/pharmacy-store-auth";
import { db } from "@/lib/db";

export async function GET() {
  const ctx = await requirePharmacyStore();
  if ("error" in ctx) return ctx.error;

  const orders = await db.pharmacyOrder.findMany({
    where: {
      pharmacyStoreId: ctx.pharmacyStoreId,
      status: { in: ["PAID", "CONFIRMED", "PREPARING", "READY", "COMPLETED"] },
    },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ orders });
}
