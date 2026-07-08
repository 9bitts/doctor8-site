/** Referência setorial para benchmarks de conformidade NR-1 e EAP (dados ilustrativos de mercado). */

export type SectorBenchmark = {
  sectorId: string;
  label: string;
  avgComplianceScore: number;
  avgEapAdoptionPercent: number;
  avgSurveyResponseRate: number;
  avgActionPlanCompletion: number;
};

export const SECTOR_BENCHMARKS: SectorBenchmark[] = [
  { sectorId: "geral", label: "Mercado geral (Brasil)", avgComplianceScore: 58, avgEapAdoptionPercent: 42, avgSurveyResponseRate: 65, avgActionPlanCompletion: 48 },
  { sectorId: "tecnologia", label: "Tecnologia e serviços", avgComplianceScore: 64, avgEapAdoptionPercent: 55, avgSurveyResponseRate: 72, avgActionPlanCompletion: 52 },
  { sectorId: "industria", label: "Indústria e manufatura", avgComplianceScore: 52, avgEapAdoptionPercent: 38, avgSurveyResponseRate: 58, avgActionPlanCompletion: 45 },
  { sectorId: "saude", label: "Saúde e hospitalar", avgComplianceScore: 61, avgEapAdoptionPercent: 48, avgSurveyResponseRate: 68, avgActionPlanCompletion: 55 },
  { sectorId: "varejo", label: "Varejo e logística", avgComplianceScore: 49, avgEapAdoptionPercent: 35, avgSurveyResponseRate: 55, avgActionPlanCompletion: 40 },
  { sectorId: "financeiro", label: "Financeiro e seguros", avgComplianceScore: 67, avgEapAdoptionPercent: 52, avgSurveyResponseRate: 70, avgActionPlanCompletion: 58 },
];

export function resolveSectorBenchmark(companySize: string | null | undefined, grauRisco: number | null): SectorBenchmark {
  if (grauRisco && grauRisco >= 3) {
    return SECTOR_BENCHMARKS.find((s) => s.sectorId === "industria") ?? SECTOR_BENCHMARKS[0];
  }
  if (companySize === "LARGE" || companySize === "MEDIUM") {
    return SECTOR_BENCHMARKS.find((s) => s.sectorId === "financeiro") ?? SECTOR_BENCHMARKS[0];
  }
  if (companySize === "MEI" || companySize === "ME") {
    return SECTOR_BENCHMARKS.find((s) => s.sectorId === "tecnologia") ?? SECTOR_BENCHMARKS[0];
  }
  return SECTOR_BENCHMARKS[0];
}

export type BenchmarkComparison = {
  sector: SectorBenchmark;
  company: {
    complianceScore: number;
    eapAdoptionPercent: number;
    actionPlanCompletion: number;
  };
  deltas: {
    compliance: number;
    eapAdoption: number;
    actionPlan: number;
  };
  status: {
    compliance: "above" | "below" | "on_par";
    eapAdoption: "above" | "below" | "on_par";
    actionPlan: "above" | "below" | "on_par";
  };
};

function compareDelta(company: number, benchmark: number): { delta: number; status: "above" | "below" | "on_par" } {
  const delta = company - benchmark;
  const status = delta >= 5 ? "above" : delta <= -5 ? "below" : "on_par";
  return { delta, status };
}

export function buildBenchmarkComparison(
  sector: SectorBenchmark,
  company: { complianceScore: number; eapAdoptionPercent: number; actionPlanCompletion: number },
): BenchmarkComparison {
  const c = compareDelta(company.complianceScore, sector.avgComplianceScore);
  const e = compareDelta(company.eapAdoptionPercent, sector.avgEapAdoptionPercent);
  const a = compareDelta(company.actionPlanCompletion, sector.avgActionPlanCompletion);

  return {
    sector,
    company,
    deltas: { compliance: c.delta, eapAdoption: e.delta, actionPlan: a.delta },
    status: { compliance: c.status, eapAdoption: e.status, actionPlan: a.status },
  };
}
