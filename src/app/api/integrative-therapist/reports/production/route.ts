import { NextRequest, NextResponse } from "next/server";
import { normalizeLang, translate } from "@/lib/i18n/translations";
import { requireIntegrativeTherapist } from "@/lib/integrative-therapist-api";
import {
  buildIntegrativeProductionReport,
  buildIntegrativeProductionCsv,
  productionPeriodLabel,
  type ProductionPeriod,
} from "@/lib/integrative-production-report";

const PERIODS: ProductionPeriod[] = ["this_month", "last_month", "year"];

export async function GET(req: NextRequest) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist, session } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const raw = req.nextUrl.searchParams.get("period") || "this_month";
  const period = PERIODS.includes(raw as ProductionPeriod) ? (raw as ProductionPeriod) : "this_month";
  const format = req.nextUrl.searchParams.get("format");

  const user = await import("@/lib/db").then((m) =>
    m.db.user.findUnique({ where: { id: session.user.id }, select: { language: true } }),
  );
  const lang = normalizeLang(user?.language);
  const t = (key: string) => translate(lang, key);

  const report = await buildIntegrativeProductionReport(therapist.id, period, lang);

  if (format === "csv") {
    const csv = buildIntegrativeProductionCsv(report, {
      period: t("it.report.csv.period"),
      periodValue: productionPeriodLabel(period, t),
      totalSessions: t("it.report.sessions"),
      structuredSessions: t("it.tpl.structuredTitle"),
      practice: t("it.report.csv.practice"),
      slug: t("it.report.csv.slug"),
      count: t("it.report.csv.count"),
    });
    const dateStr = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="producao-integrativa-${period}-${dateStr}.csv"`,
      },
    });
  }

  return NextResponse.json(report);
}
