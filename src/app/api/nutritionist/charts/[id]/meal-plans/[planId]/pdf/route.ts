import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import type { MealPlanMeal } from "@/lib/nutrition/meal-plan-types";
import { renderMealPlanHtml } from "@/lib/nutrition/meal-plan-pdf";
import {
  requireChartAccess,
  requireNutritionProfessional,
} from "@/lib/nutrition/nutrition-api";

function safeDecrypt(v: string): string {
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; planId: string } },
) {
  const ctx = await requireNutritionProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireChartAccess(professional.id, params.id, false, session.user.id);
  if ("error" in access) return access.error;

  const plan = await db.nutritionMealPlan.findFirst({
    where: { id: params.planId, patientRecordId: params.id },
    include: {
      patientRecord: { select: { firstName: true, lastName: true } },
    },
  });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const langParam = req.nextUrl.searchParams.get("lang");
  const lang = langParam === "es" || langParam === "en" ? langParam : "pt";

  const html = renderMealPlanHtml({
    title: plan.title,
    patientName: `${safeDecrypt(plan.patientRecord.firstName)} ${safeDecrypt(plan.patientRecord.lastName)}`.trim(),
    professionalName: `${professional.firstName} ${professional.lastName}`.trim(),
    notes: plan.notes,
    dailyKcalTarget: plan.dailyKcalTarget,
    meals: plan.meals as MealPlanMeal[],
    lang,
  });

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
