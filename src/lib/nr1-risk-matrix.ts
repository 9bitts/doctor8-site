import type { EmployerRiskLevel } from "@prisma/client";

/** Severity (1–5) × probability (1–5) → risk level per NR-1 GRO practice. */
export function classifyEmployerRisk(severity: number, probability: number): EmployerRiskLevel {
  const s = Math.min(5, Math.max(1, Math.round(severity)));
  const p = Math.min(5, Math.max(1, Math.round(probability)));
  const score = s * p;

  if (score >= 20) return "CRITICAL";
  if (score >= 12) return "HIGH";
  if (score >= 6) return "MEDIUM";
  return "LOW";
}

export function riskLevelLabel(level: EmployerRiskLevel): string {
  switch (level) {
    case "CRITICAL":
      return "Crítico";
    case "HIGH":
      return "Alto";
    case "MEDIUM":
      return "Médio";
    case "LOW":
      return "Baixo";
    default:
      return level;
  }
}

export function riskLevelColor(level: EmployerRiskLevel): string {
  switch (level) {
    case "CRITICAL":
      return "text-red-700 bg-red-100";
    case "HIGH":
      return "text-orange-700 bg-orange-100";
    case "MEDIUM":
      return "text-amber-700 bg-amber-100";
    case "LOW":
      return "text-emerald-700 bg-emerald-100";
    default:
      return "text-slate-700 bg-slate-100";
  }
}

/** Rough NR-1 compliance score (0–100) from employer data completeness. */
export function computeNr1ComplianceScore(input: {
  riskEntryCount: number;
  aepCompleted: boolean;
  actionPlanItemCount: number;
  actionPlanDoneCount: number;
  activeSurvey: boolean;
  eapEnabled: boolean;
  lastPgrReviewAt: Date | null;
}): number {
  let score = 0;

  if (input.riskEntryCount > 0) score += 25;
  if (input.aepCompleted) score += 20;
  if (input.actionPlanItemCount > 0) score += 15;
  if (input.actionPlanItemCount > 0) {
    score += Math.round((input.actionPlanDoneCount / input.actionPlanItemCount) * 15);
  }
  if (input.activeSurvey) score += 10;
  if (input.eapEnabled) score += 5;
  if (input.lastPgrReviewAt) {
    const days = (Date.now() - input.lastPgrReviewAt.getTime()) / (1000 * 60 * 60 * 24);
    if (days <= 365) score += 10;
    else if (days <= 730) score += 5;
  }

  return Math.min(100, score);
}
