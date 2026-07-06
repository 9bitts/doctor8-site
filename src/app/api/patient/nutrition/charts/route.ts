import { NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { decrypt } from "@/lib/encryption";
import { listPatientNutritionCharts } from "@/lib/nutrition/nutrition-api";

function safeDecrypt(v: string): string {
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const charts = await listPatientNutritionCharts(ctx.userId);
  return NextResponse.json({
    charts: charts.map((c) => ({
      ...c,
      professional: {
        ...c.professional,
        firstName: safeDecrypt(c.professional.firstName),
        lastName: safeDecrypt(c.professional.lastName),
      },
    })),
  });
}
