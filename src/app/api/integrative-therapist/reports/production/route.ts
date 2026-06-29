import { NextRequest, NextResponse } from "next/server";
import { normalizeLang } from "@/lib/i18n/translations";
import { requireIntegrativeTherapist } from "@/lib/integrative-therapist-api";
import {
  buildIntegrativeProductionReport,
  type ProductionPeriod,
} from "@/lib/integrative-production-report";

const PERIODS: ProductionPeriod[] = ["this_month", "last_month", "year"];

export async function GET(req: NextRequest) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist, session } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const raw = req.nextUrl.searchParams.get("period") || "this_month";
  const period = PERIODS.includes(raw as ProductionPeriod) ? (raw as ProductionPeriod) : "this_month";

  const user = await import("@/lib/db").then((m) =>
    m.db.user.findUnique({ where: { id: session.user.id }, select: { language: true } }),
  );
  const lang = normalizeLang(user?.language);

  const report = await buildIntegrativeProductionReport(therapist.id, period, lang);
  return NextResponse.json(report);
}
