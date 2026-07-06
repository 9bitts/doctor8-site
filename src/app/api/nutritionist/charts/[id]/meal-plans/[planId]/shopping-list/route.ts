import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import type { MealPlanMeal } from "@/lib/nutrition/meal-plan-types";
import { buildShoppingList } from "@/lib/nutrition/shopping-list";
import {
  requireChartAccess,
  requireNutritionProfessional,
} from "@/lib/nutrition/nutrition-api";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; planId: string } },
) {
  const ctx = await requireNutritionProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireChartAccess(professional.id, params.id, false, session.user.id);
  if ("error" in access) return access.error;

  const plan = await db.nutritionMealPlan.findFirst({
    where: { id: params.planId, patientRecordId: params.id },
  });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = buildShoppingList(plan.meals as MealPlanMeal[]);
  return NextResponse.json({ items });
}
