import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { searchPharmacyCatalog } from "@/lib/pharmacy-marketplace";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const { searchParams } = new URL(req.url);
  const drugCatalogId = searchParams.get("drugCatalogId")?.trim();
  if (drugCatalogId) {
    const drug = await db.drugCatalog.findFirst({
      where: { id: drugCatalogId, active: true },
      select: { id: true, name: true, presentation: true, searchIngredient: true },
    });
    if (!drug) {
      return NextResponse.json({ results: [] });
    }
    return NextResponse.json({
      results: [
        {
          drugCatalogId: drug.id,
          name: drug.name,
          activeIngredient: drug.searchIngredient || "",
          presentation: drug.presentation,
        },
      ],
    });
  }

  const filters = {
    name: searchParams.get("name") || searchParams.get("q") || undefined,
    manufacturer: searchParams.get("manufacturer") || undefined,
    activeIngredient: searchParams.get("activeIngredient") || undefined,
    presentation: searchParams.get("presentation") || undefined,
  };
  const cep = (searchParams.get("cep") || "").trim() || undefined;

  const data = await searchPharmacyCatalog(filters, cep);
  return NextResponse.json(data);
}
