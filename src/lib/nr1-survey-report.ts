import { COPSOQ_LITE_QUESTIONS } from "@/lib/nr1-copsoq-lite";

export {
  aggregateSurveyResponses,
  dimensionRiskLevel,
  getSurveyQuestions,
  getSurveyOptions,
  normalizeInstrument,
  SURVEY_INSTRUMENTS,
  type SurveyAggregateReport,
  type SurveyInstrumentId,
} from "@/lib/nr1-survey-instruments";

export function copsoqDimensionLabels(): string[] {
  return [...new Set(COPSOQ_LITE_QUESTIONS.map((q) => q.dimension))];
}
