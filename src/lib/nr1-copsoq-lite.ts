/** COPSOQ-inspired organizational survey (work conditions, not clinical diagnosis). */

export type CopsoqLiteQuestion = {
  id: string;
  dimension: string;
  textPt: string;
  hazardCodes: string[];
};

export const COPSOQ_LITE_QUESTIONS: CopsoqLiteQuestion[] = [
  {
    id: "q1",
    dimension: "Demandas",
    textPt: "Com que frequência você precisa trabalhar muito rapidamente?",
    hazardCodes: ["SOBRECARGA"],
  },
  {
    id: "q2",
    dimension: "Demandas",
    textPt: "Com que frequência você não tem tempo para concluir todas as suas tarefas?",
    hazardCodes: ["SOBRECARGA"],
  },
  {
    id: "q3",
    dimension: "Controle",
    textPt: "Você tem influência sobre a quantidade de trabalho que lhe é atribuída?",
    hazardCodes: ["BAIXO_CONTROLE"],
  },
  {
    id: "q4",
    dimension: "Controle",
    textPt: "Você pode decidir quando fazer uma pausa?",
    hazardCodes: ["BAIXO_CONTROLE"],
  },
  {
    id: "q5",
    dimension: "Apoio",
    textPt: "Com que frequência você recebe ajuda e apoio de colegas?",
    hazardCodes: ["FALTA_APOIO"],
  },
  {
    id: "q6",
    dimension: "Apoio",
    textPt: "Com que frequência sua liderança está disposta a ouvir seus problemas no trabalho?",
    hazardCodes: ["FALTA_APOIO", "RELACIONAMENTO_RUIM"],
  },
  {
    id: "q7",
    dimension: "Reconhecimento",
    textPt: "Seu trabalho é reconhecido e valorizado pela organização?",
    hazardCodes: ["BAIXO_RECONHECIMENTO"],
  },
  {
    id: "q8",
    dimension: "Clareza de papel",
    textPt: "Você sabe exatamente quais são suas responsabilidades no trabalho?",
    hazardCodes: ["PAPEL_INCERTO"],
  },
  {
    id: "q9",
    dimension: "Justiça",
    textPt: "As decisões da empresa são aplicadas de forma justa aos trabalhadores?",
    hazardCodes: ["INJUSTICA"],
  },
  {
    id: "q10",
    dimension: "Relacionamentos",
    textPt: "Existe conflito ou hostilidade entre colegas no seu ambiente de trabalho?",
    hazardCodes: ["RELACIONAMENTO_RUIM", "ASSEDIO"],
  },
  {
    id: "q11",
    dimension: "Comunicação",
    textPt: "As informações necessárias para seu trabalho chegam a tempo e com clareza?",
    hazardCodes: ["COMUNICACAO_DIFICIL"],
  },
  {
    id: "q12",
    dimension: "Trabalho remoto",
    textPt: "Você consegue se desconectar do trabalho fora do horário (especialmente em home office)?",
    hazardCodes: ["TRABALHO_REMOTO"],
  },
];

export const COPSOQ_LITE_OPTIONS = [
  { value: 1, label: "Nunca / Discordo totalmente" },
  { value: 2, label: "Raramente / Discordo" },
  { value: 3, label: "Às vezes / Neutro" },
  { value: 4, label: "Frequentemente / Concordo" },
  { value: 5, label: "Sempre / Concordo totalmente" },
] as const;

export type CopsoqLiteAnswers = Record<string, number>;

export function scoreCopsoqLiteByDimension(answers: CopsoqLiteAnswers): Record<string, number> {
  const sums: Record<string, { total: number; count: number }> = {};

  for (const q of COPSOQ_LITE_QUESTIONS) {
    const val = answers[q.id];
    if (typeof val !== "number") continue;
    if (!sums[q.dimension]) sums[q.dimension] = { total: 0, count: 0 };
    sums[q.dimension].total += val;
    sums[q.dimension].count += 1;
  }

  const result: Record<string, number> = {};
  for (const [dim, { total, count }] of Object.entries(sums)) {
    result[dim] = count > 0 ? Math.round((total / count) * 20) : 0;
  }
  return result;
}

export function suggestHazardsFromCopsoqLite(answers: CopsoqLiteAnswers): string[] {
  const suggested = new Set<string>();

  for (const q of COPSOQ_LITE_QUESTIONS) {
    const val = answers[q.id];
    if (typeof val !== "number") continue;

    const isRiskHigh =
      (q.dimension === "Controle" || q.dimension === "Apoio" || q.dimension === "Reconhecimento" ||
        q.dimension === "Clareza de papel" || q.dimension === "Justiça" || q.dimension === "Trabalho remoto")
        ? val <= 2
        : val >= 4;

    if (isRiskHigh) {
      for (const code of q.hazardCodes) suggested.add(code);
    }
  }

  return [...suggested];
}
