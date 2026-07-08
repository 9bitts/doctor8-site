import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requirePharmacyStore } from "@/lib/pharmacy-store-auth";
import { db } from "@/lib/db";
import { INVENTORY_CSV_TEMPLATE } from "@/lib/pharmacy-store-inventory-import";

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format");
  if (format === "template") {
    return new NextResponse(INVENTORY_CSV_TEMPLATE, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="doctor8-estoque-modelo.csv"',
      },
    });
  }

  const ctx = await requirePharmacyStore();
  if ("error" in ctx) return ctx.error;

  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const and: Prisma.DrugCatalogWhereInput[] = [
    { active: true, country: "BR" },
    {
      OR: [
        { searchName: { contains: q } },
        { searchIngredient: { contains: q } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
  ];

  const drugs = await db.drugCatalog.findMany({
    where: { AND: and },
    select: {
      id: true,
      name: true,
      activeIngredient: true,
      presentation: true,
      manufacturer: true,
      ggremCode: true,
      controlled: true,
    },
    orderBy: { name: "asc" },
    take: 20,
  });

  const existingIds = new Set(
    (
      await db.pharmacyStoreInventoryItem.findMany({
        where: {
          pharmacyStoreId: ctx.pharmacyStoreId,
          drugCatalogId: { in: drugs.map((d) => d.id) },
        },
        select: { drugCatalogId: true },
      })
    ).map((i) => i.drugCatalogId),
  );

  return NextResponse.json({
    results: drugs.map((d) => ({
      ...d,
      inInventory: existingIds.has(d.id),
    })),
  });
}
