import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { MealPlanMeal } from "@/lib/nutrition/meal-plan-types";
import { computeAdherence } from "@/lib/nutrition/adherence";
import {
  requireChartAccess,
  requireNutritionProfessional,
} from "@/lib/nutrition/nutrition-api";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireNutritionProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireChartAccess(professional.id, params.id, false, session.user.id);
  if ("error" in access) return access.error;

  const periodDays = Math.min(30, Number(req.nextUrl.searchParams.get("days") ?? 7) || 7);

  const [activePlan, entries] = await Promise.all([
    db.nutritionMealPlan.findFirst({
      where: { patientRecordId: params.id, isActive: true },
      orderBy: { createdAt: "desc" },
    }),
    db.nutritionFoodDiaryEntry.findMany({
      where: { patientRecordId: params.id },
      orderBy: { recordedAt: "desc" },
      take: 200,
    }),
  ]);

  const planMeals = (activePlan?.meals as MealPlanMeal[] | null) ?? null;
  const report = computeAdherence(
    planMeals,
    entries.map((e) => ({
      mealType: e.mealType,
      recordedAt: e.recordedAt.toISOString(),
      hydrationMl: e.hydrationMl,
    })),
    periodDays,
  );

  return NextResponse.json({
    report,
    activePlan: activePlan
      ? { id: activePlan.id, title: activePlan.title, mealCount: planMeals?.length ?? 0 }
      : null,
  });
}
