import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mealPlanBodySchema } from "@/lib/nutrition/meal-plan-types";
import {
  requireChartAccess,
  requireNutritionProfessional,
} from "@/lib/nutrition/nutrition-api";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireNutritionProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireChartAccess(professional.id, params.id, false, session.user.id);
  if ("error" in access) return access.error;

  const plans = await db.nutritionMealPlan.findMany({
    where: { patientRecordId: params.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    plans: plans.map((p) => ({
      id: p.id,
      title: p.title,
      notes: p.notes,
      dailyKcalTarget: p.dailyKcalTarget,
      meals: p.meals,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireNutritionProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireChartAccess(professional.id, params.id, true, session.user.id);
  if ("error" in access) return access.error;

  const body = await req.json();
  const parsed = mealPlanBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const plan = await db.nutritionMealPlan.create({
    data: {
      patientRecordId: params.id,
      professionalId: professional.id,
      title: d.title,
      notes: d.notes ?? null,
      dailyKcalTarget: d.dailyKcalTarget ?? null,
      meals: d.meals,
    },
  });

  return NextResponse.json(
    {
      id: plan.id,
      title: plan.title,
      notes: plan.notes,
      dailyKcalTarget: plan.dailyKcalTarget,
      meals: plan.meals,
      isActive: plan.isActive,
      createdAt: plan.createdAt.toISOString(),
    },
    { status: 201 },
  );
}
