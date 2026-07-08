import { COPSOQ_LITE_OPTIONS, COPSOQ_LITE_QUESTIONS, scoreCopsoqLiteByDimension, suggestHazardsFromCopsoqLite, type CopsoqLiteAnswers } from "@/lib/nr1-copsoq-lite";
import { HSE_IT_OPTIONS, HSE_IT_QUESTIONS, scoreHseItByDimension, suggestHazardsFromHseIt, type HseItAnswers } from "@/lib/nr1-hse-it";

export const SURVEY_INSTRUMENTS = [
  { id: "COPSOQ-LITE", label: "COPSOQ-lite (12 questões)", description: "Inspirado no Copenhagen Psychosocial Questionnaire" },
  { id: "HSE-IT", label: "HSE-IT (12 questões)", description: "Padrão HSE Management Standards (Reino Unido), adaptado à NR-1" },
] as const;

export type SurveyInstrumentId = (typeof SURVEY_INSTRUMENTS)[number]["id"];

export function normalizeInstrument(raw: string | null | undefined): SurveyInstrumentId {
  if (raw === "HSE-IT") return "HSE-IT";
  return "COPSOQ-LITE";
}

export function getSurveyQuestions(instrument: string) {
  const id = normalizeInstrument(instrument);
  return id === "HSE-IT" ? HSE_IT_QUESTIONS : COPSOQ_LITE_QUESTIONS;
}

export function getSurveyOptions(instrument: string) {
  const id = normalizeInstrument(instrument);
  return id === "HSE-IT" ? HSE_IT_OPTIONS : COPSOQ_LITE_OPTIONS;
}

type Answers = Record<string, number>;

function parseAnswers(raw: unknown): Answers | null {
  if (!raw || typeof raw !== "object") return null;
  const out: Answers = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "number") out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export type SurveyAggregateReport = {
  totalResponses: number;
  minGroupSize: number;
  meetsAnonymityThreshold: boolean;
  instrument: SurveyInstrumentId;
  overallDimensions: Record<string, number>;
  byDepartment: Array<{
    department: string;
    count: number;
    dimensions: Record<string, number>;
    suggestedHazards: string[];
  }>;
  suggestedHazardsOverall: string[];
};

function scoreByDimension(instrument: SurveyInstrumentId, answers: Answers): Record<string, number> {
  if (instrument === "HSE-IT") return scoreHseItByDimension(answers as HseItAnswers);
  return scoreCopsoqLiteByDimension(answers as CopsoqLiteAnswers);
}

function suggestHazards(instrument: SurveyInstrumentId, answers: Answers): string[] {
  if (instrument === "HSE-IT") return suggestHazardsFromHseIt(answers as HseItAnswers);
  return suggestHazardsFromCopsoqLite(answers as CopsoqLiteAnswers);
}

function averageDimensions(instrument: SurveyInstrumentId, list: Answers[]): Record<string, number> {
  if (list.length === 0) return {};
  const sums: Record<string, { total: number; count: number }> = {};

  for (const answers of list) {
    const scored = scoreByDimension(instrument, answers);
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

function mergeHazardSuggestions(instrument: SurveyInstrumentId, list: Answers[]): string[] {
  const counts = new Map<string, number>();
  for (const answers of list) {
    for (const code of suggestHazards(instrument, answers)) {
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([code]) => code);
}

export function aggregateSurveyResponses(
  responses: Array<{ department: string | null; answersJson: unknown }>,
  minGroupSize: number,
  instrument: string,
): SurveyAggregateReport {
  const instrumentId = normalizeInstrument(instrument);
  const allAnswers: Answers[] = [];
  const byDept = new Map<string, Answers[]>();

  for (const r of responses) {
    const answers = parseAnswers(r.answersJson);
    if (!answers) continue;
    allAnswers.push(answers);
    const dept = r.department?.trim() || "Geral";
    const list = byDept.get(dept) ?? [];
    list.push(answers);
    byDept.set(dept, list);
  }

  const overallDimensions = averageDimensions(instrumentId, allAnswers);
  const suggestedHazardsOverall = mergeHazardSuggestions(instrumentId, allAnswers);

  const byDepartment = [...byDept.entries()]
    .filter(([, list]) => list.length >= minGroupSize)
    .map(([department, list]) => ({
      department,
      count: list.length,
      dimensions: averageDimensions(instrumentId, list),
      suggestedHazards: mergeHazardSuggestions(instrumentId, list),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalResponses: allAnswers.length,
    minGroupSize,
    meetsAnonymityThreshold: allAnswers.length >= minGroupSize,
    instrument: instrumentId,
    overallDimensions,
    byDepartment,
    suggestedHazardsOverall,
  };
}

export function dimensionRiskLevel(score: number): "low" | "medium" | "high" {
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}
