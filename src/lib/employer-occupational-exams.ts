import type { EmployerAsoResult, EmployerExamType } from "@prisma/client";

export const EXAM_TYPE_LABELS: Record<EmployerExamType, string> = {
  ADMISSIONAL: "Admissional",
  PERIODICO: "Periódico",
  RETORNO_TRABALHO: "Retorno ao trabalho",
  MUDANCA_FUNCAO: "Mudança de função / risco",
  DEMISSIONAL: "Demissional",
};

export const ASO_RESULT_LABELS: Record<EmployerAsoResult, string> = {
  APTO: "Apto",
  APTO_COM_RESTRICAO: "Apto com restrição",
  INAPTO: "Inapto",
};

/** Periodicidade sugerida por grau de risco NR (meses). */
export function suggestPeriodicidadeMonths(grauRisco: number | null | undefined): number {
  if (!grauRisco || grauRisco <= 1) return 24;
  if (grauRisco === 2) return 12;
  return 6;
}

export function computeExamDueDate(
  lastCompletedAt: Date | null,
  grauRisco: number | null | undefined,
): Date {
  const months = suggestPeriodicidadeMonths(grauRisco);
  const base = lastCompletedAt ?? new Date();
  const due = new Date(base);
  due.setMonth(due.getMonth() + months);
  return due;
}

export function isExamOverdue(dueDate: Date | null, status: string): boolean {
  if (!dueDate || status === "COMPLETED" || status === "CANCELLED") return false;
  return dueDate.getTime() < Date.now();
}
