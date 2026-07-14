import { NextRequest, NextResponse } from "next/server";
import { type Lang } from "@/lib/i18n/translations";
import { requireLibraryAuth, suggestResourcesForChart } from "@/lib/professional-library";

function parseLang(value: string | null): Lang {
  if (value === "en" || value === "es" || value === "pt") return value;
  return "pt";
}

export async function GET(req: NextRequest) {
  const ctx = await requireLibraryAuth();
  if (!ctx.ok) return ctx.error;

  const chartId = req.nextUrl.searchParams.get("chartId");
  if (!chartId) {
    return NextResponse.json({ error: "chartId required" }, { status: 400 });
  }

  const lang = parseLang(req.nextUrl.searchParams.get("lang"));
  const result = await suggestResourcesForChart(ctx, chartId, lang);
  if ("error" in result && result.error === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(result);
}
