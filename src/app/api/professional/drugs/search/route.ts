// src/app/api/professional/drugs/search/route.ts
// Searches the DrugCatalog (reference database) for the prescription screen.
// Example: GET /api/professional/drugs/search?q=amox&country=BR
// Returns up to 20 matches by commercial name OR active ingredient.

import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { isDrugCountryCode } from "@/lib/drug-countries";

function normalizeQuery(q: string): string {
  return q
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const LEGACY_SELECT = {
  id: true,
  name: true,
  activeIngredient: true,
  presentation: true,
  manufacturer: true,
  country: true,
  category: true,
  controlled: true,
  prescriptionType: true,
} as const;

const FULL_SELECT = {
  ...LEGACY_SELECT,
  ggremCode: true,
  pharmaceuticalForm: true,
  dosage: true,
} as const;

async function searchLegacy(q: string, country: string) {
  return db.drugCatalog.findMany({
    where: {
      active: true,
      country,
      OR: [
        { searchName: { contains: q } },
        { searchIngredient: { contains: q } },
        { presentation: { contains: q, mode: "insensitive" } },
      ],
    },
    select: LEGACY_SELECT,
    orderBy: [{ name: "asc" }],
    take: 20,
  });
}

async function searchFull(q: string, country: string) {
  return db.drugCatalog.findMany({
    where: {
      active: true,
      country,
      OR: [
        { searchName: { contains: q } },
        { searchIngredient: { contains: q } },
        { searchPresentation: { contains: q } },
        { presentation: { contains: q, mode: "insensitive" } },
      ],
    },
    select: FULL_SELECT,
    orderBy: [{ name: "asc" }],
    take: 20,
  });
}

export async function GET(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const { searchParams } = new URL(req.url);
  const q = normalizeQuery(searchParams.get("q") || "");
  const country = searchParams.get("country") || "";

  if (!isDrugCountryCode(country)) {
    return NextResponse.json({ error: "country required", drugs: [] }, { status: 400 });
  }

  if (q.length < 2) {
    return NextResponse.json({ drugs: [] });
  }

  try {
    const drugs = await searchFull(q, country);
    return NextResponse.json({ drugs });
  } catch (err) {
    console.error("[drugs/search] full query failed, using legacy fallback:", err);
    try {
      const drugs = await searchLegacy(q, country);
      return NextResponse.json({ drugs });
    } catch (legacyErr) {
      console.error("[drugs/search] legacy query failed:", legacyErr);
      return NextResponse.json(
        { error: "Drug catalog search failed", drugs: [] },
        { status: 500 },
      );
    }
  }
}
