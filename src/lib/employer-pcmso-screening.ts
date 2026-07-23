/**
 * Individual PCMSO mental-health screening (exam-time).
 * Not a substitute for organizational GRO surveys (COPSOQ/HSE) or psychiatric diagnosis.
 */

export type PcmsoScreeningQuestion = {
  id: string;
  section: "esgotamento" | "sobrecarga" | "relacionamento" | "sofrimento";
  label: string;
};

export const PCMSO_SCREENING_OPTIONS = [
  { value: 0, label: "Nunca" },
  { value: 1, label: "Raramente" },
  { value: 2, label: "Frequentemente" },
  { value: 3, label: "Quase sempre" },
] as const;

export const PCMSO_SCREENING_QUESTIONS: PcmsoScreeningQuestion[] = [
  { id: "q1", section: "esgotamento", label: "Tenho me sentido excessivamente cansado(a) no trabalho" },
  { id: "q2", section: "esgotamento", label: "Tenho dificuldade para relaxar após o expediente" },
  { id: "q3", section: "esgotamento", label: "Sinto irritação ou impaciência frequente" },
  { id: "q4", section: "esgotamento", label: "Tenho dificuldade para dormir ou sono não reparador" },
  { id: "q5", section: "esgotamento", label: "Tenho sentido desânimo frequente" },
  { id: "q6", section: "sobrecarga", label: "Considero meu ritmo de trabalho excessivo" },
  { id: "q7", section: "sobrecarga", label: "Tenho pouco tempo para realizar minhas tarefas" },
  { id: "q8", section: "sobrecarga", label: "Sinto pressão excessiva por metas ou produtividade" },
  { id: "q9", section: "sobrecarga", label: "Tenho dificuldade para fazer pausas durante o trabalho" },
  { id: "q10", section: "sobrecarga", label: "Sinto que minha carga mental está muito elevada" },
  { id: "q11", section: "relacionamento", label: "Sinto falta de apoio no ambiente de trabalho" },
  { id: "q12", section: "relacionamento", label: "Tenho conflitos frequentes no trabalho" },
  { id: "q13", section: "relacionamento", label: "Já me senti humilhado(a), desrespeitado(a) ou intimidado(a) no trabalho" },
  { id: "q14", section: "relacionamento", label: "Sinto medo excessivo de errar" },
  { id: "q15", section: "relacionamento", label: "Percebo ambiente de trabalho muito tenso" },
  { id: "q16", section: "sofrimento", label: "Tenho dificuldade de concentração" },
  { id: "q17", section: "sofrimento", label: "Tenho percebido queda do rendimento ou produtividade" },
  { id: "q18", section: "sofrimento", label: "Tenho evitado contato social no trabalho" },
  { id: "q19", section: "sofrimento", label: "Tenho sintomas físicos relacionados ao estresse (dor de cabeça, tensão muscular, gastrite etc.)" },
  { id: "q20", section: "sofrimento", label: "Tenho pensado frequentemente em pedir afastamento por cansaço emocional" },
];

export type PcmsoScreeningBand = "NONE" | "ATTENTION" | "MODERATE" | "HIGH";

export type PcmsoScreeningResult = {
  instrument: "PCMSO_TRIAGEM_D8";
  version: 1;
  answers: Record<string, number>;
  totalScore: number;
  band: PcmsoScreeningBand;
  bandLabel: string;
  suggestedConduct: string;
  completedAt: string;
  disclaimer: string;
};

const DISCLAIMER =
  "Instrumento de triagem ocupacional. NÃO substitui avaliação médica, NÃO estabelece diagnóstico psiquiátrico e NÃO deve ser usado isoladamente para decisões disciplinares. Integra vigilância do PCMSO (NR-7) e não substitui o GRO/PGR (NR-1).";

export function classifyPcmsoScreeningScore(total: number): {
  band: PcmsoScreeningBand;
  bandLabel: string;
  suggestedConduct: string;
} {
  if (total <= 10) {
    return {
      band: "NONE",
      bandLabel: "Sem indícios relevantes",
      suggestedConduct: "Manter acompanhamento periódico habitual.",
    };
  }
  if (total <= 20) {
    return {
      band: "ATTENTION",
      bandLabel: "Atenção preventiva",
      suggestedConduct:
        "Orientações sobre sono, pausas, organização do trabalho e gerenciamento do estresse; reavaliar no próximo periódico.",
    };
  }
  if (total <= 35) {
    return {
      band: "MODERATE",
      bandLabel: "Risco psicossocial moderado",
      suggestedConduct:
        "Avaliar fatores organizacionais; verificar sobrecarga; orientar liderança; considerar acompanhamento psicológico / EAP.",
    };
  }
  return {
    band: "HIGH",
    bandLabel: "Alto risco psicossocial",
    suggestedConduct:
      "Avaliação clínica mais aprofundada; investigar burnout, ansiedade ou depressão; avaliar necessidade de afastamento; medidas organizacionais imediatas.",
  };
}

export function buildPcmsoScreeningResult(answers: Record<string, number>): PcmsoScreeningResult {
  let total = 0;
  const normalized: Record<string, number> = {};
  for (const q of PCMSO_SCREENING_QUESTIONS) {
    const raw = answers[q.id];
    const v = typeof raw === "number" && raw >= 0 && raw <= 3 ? raw : 0;
    normalized[q.id] = v;
    total += v;
  }
  const cls = classifyPcmsoScreeningScore(total);
  return {
    instrument: "PCMSO_TRIAGEM_D8",
    version: 1,
    answers: normalized,
    totalScore: total,
    band: cls.band,
    bandLabel: cls.bandLabel,
    suggestedConduct: cls.suggestedConduct,
    completedAt: new Date().toISOString(),
    disclaimer: DISCLAIMER,
  };
}

export function parsePcmsoScreening(raw: unknown): PcmsoScreeningResult | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.instrument !== "PCMSO_TRIAGEM_D8") return null;
  if (typeof o.totalScore !== "number" || typeof o.band !== "string") return null;
  return o as PcmsoScreeningResult;
}

/** Aggregate bands for SST/RH dashboards — never expose individual answers. */
export function aggregateScreeningBands(
  screenings: Array<PcmsoScreeningResult | null | undefined>,
): Record<PcmsoScreeningBand, number> {
  const out: Record<PcmsoScreeningBand, number> = {
    NONE: 0,
    ATTENTION: 0,
    MODERATE: 0,
    HIGH: 0,
  };
  for (const s of screenings) {
    if (s?.band && s.band in out) out[s.band] += 1;
  }
  return out;
}
