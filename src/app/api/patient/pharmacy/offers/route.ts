import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPharmacyOffers } from "@/lib/pharmacy-marketplace";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
