// src/app/api/professional/drugs/search/route.ts
// Searches the DrugCatalog (reference database) for the prescription screen.
// Example: GET /api/professional/drugs/search?q=amox&country=BR
// Returns up to 20 matches by commercial name OR active ingredient.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isDrugCountryCode } from "@/lib/drug-countries";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PROFESSIONAL") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const country = searchParams.get("country") || "";

  if (!isDrugCountryCode(country)) {
    return NextResponse.json({ error: "country required", drugs: [] }, { status: 400 });
  }

  // Require at least 2 characters to avoid returning the whole table
  if (q.length < 2) {
    return NextResponse.json({ drugs: [] });
  }

  const drugs = await db.drugCatalog.findMany({
    where: {
      active: true,
      country,
      OR: [
        { searchName: { contains: q } },
        { searchIngredient: { contains: q } },
      ],
    },
    select: {
      id: true,
      name: true,
      activeIngredient: true,
      presentation: true,
      manufacturer: true,
      country: true,
      category: true,
      controlled: true,
      prescriptionType: true,
    },
    orderBy: [
      { name: "asc" },
    ],
    take: 20,
  });

  return NextResponse.json({ drugs });
}
