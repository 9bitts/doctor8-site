import type { ScaleId } from "@/lib/psychology-scales";

export type RiskLevel = "none" | "moderate" | "high" | "critical";

export interface ClinicalRiskAssessment {
  level: RiskLevel;
  flags: string[];
  messagePt: string;
  messageEn: string;
  messageEs: string;
}

const NONE: ClinicalRiskAssessment = {
  level: "none",
  flags: [],
  messagePt: "",
  messageEn: "",
  messageEs: "",
};

function dassSubscale(responses: number[], indices: number[]): number {
  return indices.reduce((sum, i) => sum + (responses[i] ?? 0), 0) * 2;
}

export function assessScaleRisk(
  scaleId: ScaleId,
  responses: number[],
  score: number,
): ClinicalRiskAssessment {
  const flags: string[] = [];

  if (scaleId === "PHQ9") {
    if (responses[8] >= 2) {
      flags.push("suicidal_ideation_severe");
    } else if (responses[8] >= 1) {
      flags.push("suicidal_ideation_mild");
    }
    if (score >= 20) flags.push("depression_severe");
    else if (score >= 15) flags.push("depression_moderate");
  }

  if (scaleId === "GAD7") {
    if (score >= 15) flags.push("anxiety_severe");
    else if (score >= 10) flags.push("anxiety_moderate");
  }

  if (scaleId === "BAI") {
    if (score >= 26) flags.push("anxiety_severe");
    else if (score >= 16) flags.push("anxiety_moderate");
  }

  if (scaleId === "BDI2") {
    if (score >= 29) flags.push("depression_severe");
    else if (score >= 20) flags.push("depression_moderate");
  }

  if (scaleId === "DASS21" && responses.length === 21) {
    const dep = dassSubscale(responses, [2, 4, 9, 12, 15, 16, 20]);
    const anx = dassSubscale(responses, [1,  3, 6, 8, 14, 18, 19]);
    const str = dassSubscale(responses, [0, 5, 7, 10, 11, 13, 17]);
    if (dep >= 21) flags.push("dass_depression_severe");
    if (anx >= 15) flags.push("dass_anxiety_severe");
    if (str >= 26) flags.push("dass_stress_severe");
  }

  if (flags.length === 0) return NONE;

  const critical = flags.some((f) => f.startsWith("suicidal"));
  const high = critical || flags.some((f) => f.includes("severe"));

  return {
    level: critical ? "critical" : high ? "high" : "moderate",
    flags,
    messagePt: critical
      ? "Alerta crítico: item de ideação suicida positivo. Avalie risco imediatamente e registre encaminhamento se necessário (CFP Res. 09/2024)."
      : high
        ? "Pontuação elevada — considere avaliação clínica aprofundada e monitoramento próximo."
        : "Pontuação moderada — acompanhe evolução nas próximas sessões.",
    messageEn: critical
      ? "Critical alert: suicidal ideation item positive. Assess risk immediately and document referral if needed."
      : high
        ? "Elevated score — consider in-depth clinical assessment and close monitoring."
        : "Moderate score — monitor progress in upcoming sessions.",
    messageEs: critical
      ? "Alerta crítica: ítem de ideación suicida positivo. Evalúe el riesgo de inmediato y registre derivación si es necesario."
      : high
        ? "Puntuación elevada — considere evaluación clínica profunda y seguimiento cercano."
        : "Puntuación moderada — monitoree la evolución en las próximas sesiones.",
  };
}

export function assessNoteTextRisk(text: string): ClinicalRiskAssessment {
  const lower = text.toLowerCase();
  const criticalPatterns = [
    /\bsuic[ií]d/i,
    /\bautoagress/i,
    /\bautomutila/i,
    /\bme matar\b/i,
    /\btirar a pr[oó]pria vida\b/i,
    /\bkill (myself|himself|herself)\b/i,
  ];
  const moderatePatterns = [
    /\bideação\b/i,
    /\bsem esperan[cç]a\b/i,
    /\bdesejo de morrer\b/i,
    /\bwant to die\b/i,
  ];

  if (criticalPatterns.some((re) => re.test(lower))) {
    return {
      level: "critical",
      flags: ["note_suicidal_content"],
      messagePt: "O texto contém termos associados a risco suicida. Revise o caso e registre medidas de proteção.",
      messageEn: "Text mentions suicidal risk. Review the case and document protective measures.",
      messageEs: "El texto menciona riesgo suicida. Revise el caso y registre medidas de protección.",
    };
  }
  if (moderatePatterns.some((re) => re.test(lower))) {
    return {
      level: "moderate",
      flags: ["note_distress_content"],
      messagePt: "O texto sugere sofrimento significativo — considere escalas e avaliação de risco.",
      messageEn: "Text suggests significant distress — consider scales and risk assessment.",
      messageEs: "El texto sugiere malestar significativo — considere escalas y evaluación de riesgo.",
    };
  }
  return NONE;
}
