import { COPSOQ_LITE_QUESTIONS, scoreCopsoqLiteByDimension, suggestHazardsFromCopsoqLite, type CopsoqLiteAnswers } from "@/lib/nr1-copsoq-lite";

type SurveyResponseRow = {
  department: string | null;
  answersJson: unknown;
};

export type SurveyAggregateReport = {
  totalResponses: number;
  minGroupSize: number;
  meetsAnonymityThreshold: boolean;
  overallDimensions: Record<string, number>;
  byDepartment: Array<{
    department: string;
    count: number;
    dimensions: Record<string, number>;
    suggestedHazards: string[];
  }>;
  suggestedHazardsOverall: string[];
};

function parseAnswers(raw: unknown): CopsoqLiteAnswers | null {
  if (!raw || typeof raw !== "object") return null;
  const out: CopsoqLiteAnswers = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "number") out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function aggregateSurveyResponses(
  responses: SurveyResponseRow[],
  minGroupSize: number,
): SurveyAggregateReport {
  const allAnswers: CopsoqLiteAnswers[] = [];
  const byDept = new Map<string, CopsoqLiteAnswers[]>();

  for (const r of responses) {
    const answers = parseAnswers(r.answersJson);
    if (!answers) continue;
    allAnswers.push(answers);
    const dept = r.department?.trim() || "Geral";
    const list = byDept.get(dept) ?? [];
    list.push(answers);
    byDept.set(dept, list);
  }

  const overallDimensions = averageDimensions(allAnswers);
  const suggestedHazardsOverall = mergeHazardSuggestions(allAnswers);

  const byDepartment = [...byDept.entries()]
    .filter(([, list]) => list.length >= minGroupSize)
    .map(([department, list]) => ({
      department,
      count: list.length,
      dimensions: averageDimensions(list),
      suggestedHazards: mergeHazardSuggestions(list),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalResponses: allAnswers.length,
    minGroupSize,
    meetsAnonymityThreshold: allAnswers.length >= minGroupSize,
    overallDimensions,
    byDepartment,
    suggestedHazardsOverall,
  };
}

function averageDimensions(list: CopsoqLiteAnswers[]): Record<string, number> {
  if (list.length === 0) return {};
  const sums: Record<string, { total: number; count: number }> = {};

  for (const answers of list) {
    const scored = scoreCopsoqLiteByDimension(answers);
    for (const [dim, val] of Object.entries(scored)) {
      if (!sums[dim]) sums[dim] = { total: 0, count: 0 };
      sums[dim].total += val;
      sums[dim].count += 1;
    }
  }

  const result: Record<string, number> = {};
  for (const [dim, { total, count }] of Object.entries(sums)) {
    result[dim] = Math.round(total / count);
  }
  return result;
}

function mergeHazardSuggestions(list: CopsoqLiteAnswers[]): string[] {
  const counts = new Map<string, number>();
  for (const answers of list) {
    for (const code of suggestHazardsFromCopsoqLite(answers)) {
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([code]) => code);
}

export function dimensionRiskLevel(score: number): "low" | "medium" | "high" {
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

export function copsoqDimensionLabels(): string[] {
  return [...new Set(COPSOQ_LITE_QUESTIONS.map((q) => q.dimension))];
}
