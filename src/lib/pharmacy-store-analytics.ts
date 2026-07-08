import { db } from "@/lib/db";

export type PharmacyStoreAnalytics = {
  ordersTotal: number;
  ordersPaid: number;
  ordersCompleted: number;
  ordersPending: number;
  revenueCents: number;
  revenueLast30DaysCents: number;
  ordersLast7Days: number;
  ordersLast30Days: number;
  inventoryAvailable: number;
  avgOrderCents: number;
};

export async function buildPharmacyStoreAnalytics(
  pharmacyStoreId: string,
): Promise<PharmacyStoreAnalytics> {
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    ordersTotal,
    ordersPaid,
    ordersCompleted,
    ordersPending,
    revenueAgg,
    revenue30Agg,
    orders7,
    orders30,
    inventoryAvailable,
  ] = await Promise.all([
    db.pharmacyOrder.count({ where: { pharmacyStoreId } }),
    db.pharmacyOrder.count({
      where: {
        pharmacyStoreId,
        status: { in: ["PAID", "CONFIRMED", "PREPARING", "READY", "COMPLETED"] },
      },
    }),
    db.pharmacyOrder.count({ where: { pharmacyStoreId, status: "COMPLETED" } }),
    db.pharmacyOrder.count({
      where: {
        pharmacyStoreId,
        status: { in: ["PAID", "CONFIRMED", "PREPARING", "READY"] },
      },
    }),
    db.pharmacyOrder.aggregate({
      where: {
        pharmacyStoreId,
        status: { in: ["PAID", "CONFIRMED", "PREPARING", "READY", "COMPLETED"] },
      },
      _sum: { totalCents: true },
    }),
    db.pharmacyOrder.aggregate({
      where: {
        pharmacyStoreId,
        paidAt: { gte: d30 },
        status: { in: ["PAID", "CONFIRMED", "PREPARING", "READY", "COMPLETED"] },
      },
      _sum: { totalCents: true },
    }),
    db.pharmacyOrder.count({ where: { pharmacyStoreId, createdAt: { gte: d7 } } }),
    db.pharmacyOrder.count({ where: { pharmacyStoreId, createdAt: { gte: d30 } } }),
    db.pharmacyStoreInventoryItem.count({
      where: { pharmacyStoreId, available: true },
    }),
  ]);

  const revenueCents = revenueAgg._sum.totalCents ?? 0;
  const revenueLast30DaysCents = revenue30Agg._sum.totalCents ?? 0;

  return {
    ordersTotal,
    ordersPaid,
    ordersCompleted,
    ordersPending,
    revenueCents,
    revenueLast30DaysCents,
    ordersLast7Days: orders7,
    ordersLast30Days: orders30,
    inventoryAvailable,
    avgOrderCents: ordersPaid > 0 ? Math.round(revenueCents / ordersPaid) : 0,
  };
}
