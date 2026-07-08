/** HSE Management Standards (HSE-IT inspired) — organizational psychosocial factors. */

export type HseItQuestion = {
  id: string;
  dimension: string;
  textPt: string;
  hazardCodes: string[];
  /** When true, low scores (1-2) indicate risk; when false, high scores (4-5) indicate risk. */
  inverted: boolean;
};

export const HSE_IT_QUESTIONS: HseItQuestion[] = [
  {
    id: "h1",
    dimension: "Demandas",
    textPt: "As exigências de trabalho feitas sobre mim são excessivas.",
    hazardCodes: ["SOBRECARGA"],
    inverted: false,
  },
  {
    id: "h2",
    dimension: "Demandas",
    textPt: "Tenho prazos impossíveis de cumprir.",
    hazardCodes: ["SOBRECARGA"],
    inverted: false,
  },
  {
    id: "h3",
    dimension: "Controle",
    textPt: "Posso decidir quando e como fazer meu trabalho.",
    hazardCodes: ["BAIXO_CONTROLE"],
    inverted: true,
  },
  {
    id: "h4",
    dimension: "Controle",
    textPt: "Tenho autonomia para organizar minhas tarefas.",
    hazardCodes: ["BAIXO_CONTROLE"],
    inverted: true,
  },
  {
    id: "h5",
    dimension: "Apoio da liderança",
    textPt: "Recebo apoio adequado da minha liderança quando o trabalho se torna difícil.",
    hazardCodes: ["FALTA_APOIO"],
    inverted: true,
  },
  {
    id: "h6",
    dimension: "Apoio da liderança",
    textPt: "Posso contar com minha liderança para discutir problemas no trabalho.",
    hazardCodes: ["FALTA_APOIO", "RELACIONAMENTO_RUIM"],
    inverted: true,
  },
  {
    id: "h7",
    dimension: "Apoio entre pares",
    textPt: "Recebo o apoio necessário dos colegas quando o trabalho se torna difícil.",
    hazardCodes: ["FALTA_APOIO"],
    inverted: true,
  },
  {
    id: "h8",
    dimension: "Relacionamentos",
    textPt: "Há conflitos ou assédio no meu ambiente de trabalho.",
    hazardCodes: ["RELACIONAMENTO_RUIM", "ASSEDIO"],
    inverted: false,
  },
  {
    id: "h9",
    dimension: "Papel",
    textPt: "Tenho clareza sobre minhas responsabilidades e o que se espera de mim.",
    hazardCodes: ["PAPEL_INCERTO"],
    inverted: true,
  },
  {
    id: "h10",
    dimension: "Papel",
    textPt: "Sei exatamente quais são meus objetivos de trabalho.",
    hazardCodes: ["PAPEL_INCERTO"],
    inverted: true,
  },
  {
    id: "h11",
    dimension: "Mudanças",
    textPt: "As mudanças organizacionais são comunicadas com antecedência e clareza.",
    hazardCodes: ["COMUNICACAO_DIFICIL", "MUDANCA_ORG"],
    inverted: true,
  },
  {
    id: "h12",
    dimension: "Mudanças",
    textPt: "Tenho oportunidade de participar das decisões que afetam meu trabalho.",
    hazardCodes: ["BAIXO_CONTROLE", "COMUNICACAO_DIFICIL"],
    inverted: true,
  },
];

export const HSE_IT_OPTIONS = [
  { value: 1, label: "Nunca" },
  { value: 2, label: "Raramente" },
  { value: 3, label: "Às vezes" },
  { value: 4, label: "Frequentemente" },
  { value: 5, label: "Sempre" },
] as const;

export type HseItAnswers = Record<string, number>;

export function scoreHseItByDimension(answers: HseItAnswers): Record<string, number> {
  const sums: Record<string, { total: number; count: number }> = {};

  for (const q of HSE_IT_QUESTIONS) {
    const val = answers[q.id];
    if (typeof val !== "number") continue;
    const riskVal = q.inverted ? 6 - val : val;
    if (!sums[q.dimension]) sums[q.dimension] = { total: 0, count: 0 };
    sums[q.dimension].total += riskVal;
    sums[q.dimension].count += 1;
  }

  const result: Record<string, number> = {};
  for (const [dim, { total, count }] of Object.entries(sums)) {
    result[dim] = count > 0 ? Math.round((total / count) * 20) : 0;
  }
  return result;
}

export function suggestHazardsFromHseIt(answers: HseItAnswers): string[] {
  const suggested = new Set<string>();

  for (const q of HSE_IT_QUESTIONS) {
    const val = answers[q.id];
    if (typeof val !== "number") continue;

    const isRiskHigh = q.inverted ? val <= 2 : val >= 4;
    if (isRiskHigh) {
      for (const code of q.hazardCodes) suggested.add(code);
    }
  }

  return [...suggested];
}
