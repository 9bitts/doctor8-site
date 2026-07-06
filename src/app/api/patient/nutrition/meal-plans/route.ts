import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePatient, isApiError } from "@/lib/api-auth";
import type { MealPlanMeal } from "@/lib/nutrition/meal-plan-types";
import { requirePatientLinkedChart } from "@/lib/nutrition/nutrition-api";

export async function GET(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const chartId = req.nextUrl.searchParams.get("chartId");
  if (!chartId) {
    return NextResponse.json({ error: "chartId required" }, { status: 400 });
  }

  const linked = await requirePatientLinkedChart(chartId, ctx.userId);
  if ("error" in linked) return linked.error;

  const plans = await db.nutritionMealPlan.findMany({
    where: { patientRecordId: chartId, isActive: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({
    plans: plans.map((p) => ({
      id: p.id,
      title: p.title,
      notes: p.notes,
      dailyKcalTarget: p.dailyKcalTarget,
      meals: p.meals as MealPlanMeal[],
      createdAt: p.createdAt.toISOString(),
    })),
  });
}
