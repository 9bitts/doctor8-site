import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
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

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const entries = await db.nutritionFoodDiaryEntry.findMany({
    where: {
      patientRecordId: params.id,
      ...(from || to
        ? {
            recordedAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
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
