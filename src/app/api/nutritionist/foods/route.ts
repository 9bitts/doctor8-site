import { NextRequest, NextResponse } from "next/server";
import { searchTacoFoods } from "@/lib/nutrition/taco-foods";
import { requireNutritionProfessional } from "@/lib/nutrition/nutrition-api";

export async function GET(req: NextRequest) {
  const ctx = await requireNutritionProfessional();
  if ("error" in ctx) return ctx.error;

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const limit = Math.min(50, Number(req.nextUrl.searchParams.get("limit") ?? 25) || 25);
  return NextResponse.json({ foods: searchTacoFoods(q, limit) });
}
