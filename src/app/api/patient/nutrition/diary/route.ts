import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { requirePatientLinkedChart } from "@/lib/nutrition/nutrition-api";

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

  const entry = await db.nutritionFoodDiaryEntry.create({
    data: {
      patientRecordId: parsed.data.chartId,
      patientUserId: ctx.userId,
      mealType: parsed.data.mealType,
      description: parsed.data.description,
      hydrationMl: parsed.data.hydrationMl ?? null,
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
