import { NextRequest, NextResponse } from "next/server";
import { localeOf } from "@/lib/i18n/translations";
import { requireLibraryAuth, suggestResourcesForChart } from "@/lib/professional-library";

export async function GET(req: NextRequest) {
  const ctx = await requireLibraryAuth();
  if (!ctx.ok) return ctx.error;

  const chartId = req.nextUrl.searchParams.get("chartId");
  if (!chartId) {
    return NextResponse.json({ error: "chartId required" }, { status: 400 });
  }

  const lang = localeOf("pt");
  const result = await suggestResourcesForChart(ctx, chartId, lang);
  return NextResponse.json(result);
}
