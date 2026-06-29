import { db } from "@/lib/db";
import { parseIntegrativeNoteContent } from "@/lib/pics/consult-templates";
import { safeDecrypt } from "@/lib/integrative-therapist-api";
import { picBySlug, picLabel } from "@/lib/pics/practices";
import type { Lang } from "@/lib/i18n/translations";

export type ProductionPeriod = "this_month" | "last_month" | "year";

function periodRange(period: ProductionPeriod): { start: Date; end: Date } {
  const now = new Date();
  if (period === "this_month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }
  if (period === "last_month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
    };
  }
  return {
    start: new Date(now.getFullYear(), 0, 1),
    end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
  };
}

export async function buildIntegrativeProductionReport(
  integrativeTherapistId: string,
  period: ProductionPeriod,
  lang: Lang = "pt",
) {
  const { start, end } = periodRange(period);

  const notes = await db.medicalDocument.findMany({
    where: {
      integrativeTherapistId,
      type: "CLINICAL_NOTE",
      createdAt: { gte: start, lte: end },
    },
    select: { content: true },
  });

  const byPractice = new Map<string, number>();
  let structuredCount = 0;

  for (const note of notes) {
    const decrypted = safeDecrypt(note.content);
    const parsed = parseIntegrativeNoteContent(decrypted);
    if (parsed.format === "STRUCTURED") structuredCount += 1;
    const slug = parsed.practiceSlug || "unknown";
    byPractice.set(slug, (byPractice.get(slug) ?? 0) + 1);
  }

  const practices = Array.from(byPractice.entries())
    .map(([slug, count]) => {
      const p = picBySlug(slug);
      return {
        slug,
        label: p ? picLabel(p, lang) : slug === "unknown" ? "?" : slug,
        count,
      };
    })
    .sort((a, b) => b.count - a.count);

  return {
    period,
    totalSessions: notes.length,
    structuredSessions: structuredCount,
    practices,
    range: { start: start.toISOString(), end: end.toISOString() },
  };
}

export type IntegrativeProductionReport = Awaited<
  ReturnType<typeof buildIntegrativeProductionReport>
>;

export function productionPeriodLabel(
  period: ProductionPeriod,
  t: (key: string) => string,
): string {
  if (period === "this_month") return t("fin.periodThisMonth");
  if (period === "last_month") return t("fin.periodLastMonth");
  return t("fin.periodThisYear");
}

export function buildIntegrativeProductionCsv(
  report: IntegrativeProductionReport,
  labels: {
    period: string;
    periodValue: string;
    totalSessions: string;
    structuredSessions: string;
    practice: string;
    slug: string;
    count: string;
  },
): string {
  const cell = (v: string | number) => String(v).replace(/;/g, ",");
  const lines = [
    `${labels.period};${cell(labels.periodValue)}`,
    `${labels.totalSessions};${report.totalSessions}`,
    `${labels.structuredSessions};${report.structuredSessions}`,
    "",
    `${labels.practice};${labels.slug};${labels.count}`,
    ...report.practices.map(
      (p) => `${cell(p.label)};${cell(p.slug)};${p.count}`,
    ),
  ];
  return `\uFEFF${lines.join("\n")}`;
}
