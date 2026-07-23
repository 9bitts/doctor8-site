/** Default PCMSO exam matrix rows by GHE / function. */

import { PSYCHOSOCIAL_QUESTIONNAIRE_EXAM } from "@/lib/employer-risk-catalog";

export type PcmsoExamMatrixExam = {
  name: string;
  admissional: boolean;
  periodico: boolean;
  /** Return-to-work column (RETORNO AO TRABALHO) */
  retorno?: boolean;
  demissional: boolean;
  periodicity: string;
};

export type PcmsoExamMatrixRow = {
  id: string;
  gheName: string;
  sector: string;
  functionName: string;
  /** Linked EmployerGheGroup id when available */
  gheGroupId?: string;
  exams: PcmsoExamMatrixExam[];
};

export const DEFAULT_PCMSO_EXAM_MATRIX: PcmsoExamMatrixRow[] = [
  {
    id: "ghe_admin",
    gheName: "GHE 01 — Administrativo",
    sector: "Administrativo",
    functionName: "Escritório / atendimento",
    exams: [
      { name: "Exame clínico", admissional: true, periodico: true, retorno: true, demissional: true, periodicity: "Anual" },
      { name: "Acuidade Visual", admissional: true, periodico: true, retorno: false, demissional: false, periodicity: "Anual" },
      {
        name: PSYCHOSOCIAL_QUESTIONNAIRE_EXAM,
        admissional: true,
        periodico: true,
        retorno: false,
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
  return (raw as PcmsoExamMatrixRow[]).map((r) => ({
    ...r,
    exams: (r.exams ?? []).map((e) => ({
      ...e,
      retorno: Boolean(e.retorno),
    })),
  }));
}

export function isPsychosocialQuestionnaireExam(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("psicossocial") || n.includes("questionário psicossocial");
}
