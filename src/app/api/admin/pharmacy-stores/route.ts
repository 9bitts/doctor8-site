import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stores = await db.pharmacyStore.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      cnpj: true,
      nomeFantasia: true,
      razaoSocial: true,
      slug: true,
      status: true,
      platformFeeCents: true,
      addressCity: true,
      addressState: true,
      contactEmail: true,
      contactPhone: true,
      latitude: true,
      longitude: true,
      createdAt: true,
      _count: {
        select: {
          inventory: true,
          orders: true,
          members: true,
        },
      },
    },
  });

  return NextResponse.json({
    stores: stores.map((s) => ({
      id: s.id,
      cnpj: s.cnpj,
      nomeFantasia: s.nomeFantasia,
      razaoSocial: s.razaoSocial,
      slug: s.slug,
      status: s.status,
      platformFeeCents: s.platformFeeCents,
      addressCity: s.addressCity,
      addressState: s.addressState,
      contactEmail: s.contactEmail,
      contactPhone: s.contactPhone,
      geocoded: s.latitude != null && s.longitude != null,
      inventoryCount: s._count.inventory,
      orderCount: s._count.orders,
      memberCount: s._count.members,
      createdAt: s.createdAt.toISOString(),
    })),
  });
}
