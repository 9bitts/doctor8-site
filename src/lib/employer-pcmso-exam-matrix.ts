/** Default PCMSO exam matrix rows by GHE / function. */

export type PcmsoExamMatrixRow = {
  id: string;
  gheName: string;
  sector: string;
  functionName: string;
  exams: Array<{
    name: string;
    admissional: boolean;
    periodico: boolean;
    demissional: boolean;
    periodicity: string;
  }>;
};

export const DEFAULT_PCMSO_EXAM_MATRIX: PcmsoExamMatrixRow[] = [
  {
    id: "ghe_admin",
    gheName: "GHE 01 — Administrativo",
    sector: "Administrativo",
    functionName: "Escritório / atendimento",
    exams: [
      { name: "Exame clínico", admissional: true, periodico: true, demissional: true, periodicity: "Anual" },
      { name: "Acuidade visual", admissional: true, periodico: true, demissional: false, periodicity: "Anual" },
      {
        name: "Questionário psicossocial (triagem PCMSO)",
        admissional: false,
        periodico: true,
        demissional: false,
        periodicity: "Anual",
      },
    ],
  },
];

export function parseExamMatrix(raw: unknown): PcmsoExamMatrixRow[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_PCMSO_EXAM_MATRIX.map((r) => ({
      ...r,
      exams: r.exams.map((e) => ({ ...e })),
    }));
  }
  return raw as PcmsoExamMatrixRow[];
}
