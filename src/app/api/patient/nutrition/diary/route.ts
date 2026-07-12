import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { requirePatientLinkedChart } from "@/lib/nutrition/nutrition-api";
import { isValidNutritionDiaryPhotoKey } from "@/lib/upload-key-validation";

const createSchema = z.object({
  chartId: z.string(),
  mealType: z.enum([
    "BREAKFAST",
    "MORNING_SNACK",
    "LUNCH",
    "AFTERNOON_SNACK",
    "DINNER",
    "SUPPER",
    "OTHER",
  ]),
  description: z.string().min(1).max(5000),
  hydrationMl: z.number().int().min(0).max(10000).optional(),
  photoKey: z.string().max(500).optional(),
  recordedAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const chartId = req.nextUrl.searchParams.get("chartId");
  if (!chartId) {
    return NextResponse.json({ error: "chartId required" }, { status: 400 });
  }

  const linked = await requirePatientLinkedChart(chartId, ctx.userId);
  if ("error" in linked) return linked.error;

  const entries = await db.nutritionFoodDiaryEntry.findMany({
    where: { patientRecordId: chartId, patientUserId: ctx.userId },
    orderBy: { recordedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      mealType: e.mealType,
      description: e.description,
      hydrationMl: e.hydrationMl,
      photoKey: e.photoKey,
      recordedAt: e.recordedAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const linked = await requirePatientLinkedChart(parsed.data.chartId, ctx.userId);
  if ("error" in linked) return linked.error;

  if (
    parsed.data.photoKey &&
    !isValidNutritionDiaryPhotoKey(parsed.data.photoKey, ctx.userId)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const entry = await db.nutritionFoodDiaryEntry.create({
    data: {
      patientRecordId: parsed.data.chartId,
      patientUserId: ctx.userId,
      mealType: parsed.data.mealType,
      description: parsed.data.description,
      hydrationMl: parsed.data.hydrationMl ?? null,
      photoKey: parsed.data.photoKey ?? null,
      recordedAt: parsed.data.recordedAt ? new Date(parsed.data.recordedAt) : undefined,
    },
  });

  return NextResponse.json(
    {
      id: entry.id,
      mealType: entry.mealType,
      description: entry.description,
      hydrationMl: entry.hydrationMl,
      recordedAt: entry.recordedAt.toISOString(),
    },
    { status: 201 },
  );
}
