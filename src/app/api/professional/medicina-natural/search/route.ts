import { NextRequest, NextResponse } from "next/server";
import type { CategoriaPraticaMedicinaNatural } from "@prisma/client";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import {
  countMedicinaNaturalItems,
  searchMedicinaNaturalItems,
} from "@/lib/medicina-natural-catalog/search-server";

const VALID_CATEGORIAS = new Set<string>([
  "FITOTERAPICO",
  "FLORAL",
  "AROMATERAPIA",
  "HOMEOPATIA",
  "APITERAPIA",
]);

export async function GET(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || undefined;
  const categoriaRaw = searchParams.get("categoria");
  const categoria = categoriaRaw && VALID_CATEGORIAS.has(categoriaRaw)
    ? (categoriaRaw as CategoriaPraticaMedicinaNatural)
    : undefined;
  const renisus = searchParams.get("renisus") === "1";
  const take = Math.min(Number(searchParams.get("take") || 20), 100);

  if (q && q.trim().length < 2) {
    return NextResponse.json({ items: [], total: 0 });
  }

  try {
    const [items, total] = await Promise.all([
      searchMedicinaNaturalItems({ q, categoria, renisus, take }),
      categoria ? countMedicinaNaturalItems(categoria) : Promise.resolve(0),
    ]);
    return NextResponse.json({ items, total: categoria ? total : items.length });
  } catch (err) {
    console.error("[medicina-natural/search] professional:", err);
    return NextResponse.json({ error: "Search failed", items: [] }, { status: 500 });
  }
}
