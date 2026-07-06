import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePatient, isApiError } from "@/lib/api-auth";
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

  const entries = await db.nutritionAnthropometryEntry.findMany({
    where: { patientRecordId: chartId },
    orderBy: { recordedAt: "asc" },
    take: 50,
  });

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      recordedAt: e.recordedAt.toISOString(),
      weightKg: e.weightKg,
      heightCm: e.heightCm,
      bmi: e.bmi,
      waistCm: e.waistCm,
      context: e.context,
    })),
  });
}
