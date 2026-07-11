import { NextRequest, NextResponse } from "next/server";
import type { CategoriaPraticaMedicinaNatural } from "@prisma/client";
import { requirePharmacyStore } from "@/lib/pharmacy-store-auth";
import { db } from "@/lib/db";
import { searchMedicinaNaturalItems } from "@/lib/medicina-natural-catalog/search-server";

const VALID_CATEGORIAS = new Set<string>([
  "FITOTERAPICO",
  "FLORAL",
  "AROMATERAPIA",
  "HOMEOPATIA",
  "APITERAPIA",
]);

export async function GET(req: NextRequest) {
  const ctx = await requirePharmacyStore();
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || undefined;
  const categoriaRaw = searchParams.get("categoria");
  const categoria = categoriaRaw && VALID_CATEGORIAS.has(categoriaRaw)
    ? (categoriaRaw as CategoriaPraticaMedicinaNatural)
    : undefined;
  const take = Math.min(Number(searchParams.get("take") || 15), 30);

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ items: [] });
  }

  try {
    const items = await searchMedicinaNaturalItems({ q, categoria, take });
    const storeId = ctx.pharmacyStoreId;
    const slugs = items.map((i) => i.slug);
    const inStock = slugs.length
      ? await db.pharmacyStoreInventoryItem.findMany({
          where: { pharmacyStoreId: storeId, mnSlug: { in: slugs } },
          select: { mnSlug: true },
        })
      : [];
    const inStockSet = new Set(inStock.map((r) => r.mnSlug).filter(Boolean));

    return NextResponse.json({
      items: items.map((item) => ({
        ...item,
        inInventory: inStockSet.has(item.slug),
      })),
    });
  } catch (err) {
    console.error("[pharmacy-store/medicina-natural/search]", err);
    return NextResponse.json({ error: "Search failed", items: [] }, { status: 500 });
  }
}
