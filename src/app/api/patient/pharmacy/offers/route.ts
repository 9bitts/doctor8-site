import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getPharmacyOffers } from "@/lib/pharmacy-marketplace";

export async function GET(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const { searchParams } = new URL(req.url);
  const drugCatalogId = searchParams.get("drugCatalogId")?.trim();
  const name = searchParams.get("name")?.trim();
  const cep = (searchParams.get("cep") || "").trim() || undefined;

  let drug = null;

  if (drugCatalogId) {
    drug = await db.drugCatalog.findFirst({
      where: { id: drugCatalogId, active: true, country: "BR" },
      select: {
        id: true,
        name: true,
        activeIngredient: true,
        presentation: true,
      },
    });
  }

  if (!drug && name) {
    drug = {
      id: undefined,
      name,
      activeIngredient: searchParams.get("activeIngredient")?.trim() || name,
      presentation: searchParams.get("presentation")?.trim() || "",
    };
  }

  if (!drug) {
    return NextResponse.json(
      { error: "drugCatalogId or name is required" },
      { status: 400 }
    );
  }

  const data = await getPharmacyOffers(
    {
      drugCatalogId: drug.id,
      name: drug.name,
      activeIngredient: drug.activeIngredient,
      presentation: drug.presentation,
    },
    cep
  );

  return NextResponse.json(data);
}
