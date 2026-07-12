import type { EmployerAsoResult, EmployerAsoSource, EmployerExamStatus } from "@prisma/client";

export type ExamAsoState = {
  status: EmployerExamStatus | string;
  asoResult: EmployerAsoResult | string | null;
  asoRestrictions?: string | null;
};

export type EmployerExamPatchInput = {
  status?: EmployerExamStatus | string;
  asoResult?: EmployerAsoResult | string | null;
  asoRestrictions?: string | null;
  physicianName?: string | null;
  physicianCrm?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  rectify?: boolean;
  asoSource?: EmployerAsoSource | string;
};

export type PatchValidationError = {
  status: 400 | 403 | 409;
  error: string;
};

export function isAsoEmitted(exam: ExamAsoState): boolean {
  return exam.status === "COMPLETED" && exam.asoResult != null;
}

export function isAsoCompletionTransition(existing: ExamAsoState, next: ExamAsoState): boolean {
  return !isAsoEmitted(existing) && isAsoEmitted(next);
}

const ASO_FIELD_KEYS = [
  "asoResult",
  "asoRestrictions",
  "physicianName",
  "physicianCrm",
  "completedAt",
] as const;

export function patchTouchesAsoFields(input: EmployerExamPatchInput): boolean {
  return ASO_FIELD_KEYS.some((key) => input[key] !== undefined);
}

export function validateEmployerExamPatch(
  existing: ExamAsoState,
  input: EmployerExamPatchInput,
): PatchValidationError | null {
  const asoEmitted = isAsoEmitted(existing);

  if (asoEmitted && !input.rectify && patchTouchesAsoFields(input)) {
    return { status: 409, error: "ASO já emitido; use retificação" };
  }

  if (input.rectify && !input.notes?.trim()) {
    return { status: 400, error: "Justificativa obrigatória para retificação." };
  }

  const effectiveAsoResult =
    input.asoResult !== undefined ? input.asoResult : existing.asoResult;

  if (effectiveAsoResult === "APTO_COM_RESTRICAO") {
    const restrictions =
      input.asoRestrictions !== undefined
        ? input.asoRestrictions?.trim()
        : existing.asoRestrictions?.trim();
    if (!restrictions) {
      return {
        status: 400,
        error: "Restrições obrigatórias para apto com restrição.",
      };
    }
  }

  if (input.asoResult !== undefined && input.asoResult !== null) {
    if (input.asoSource !== "TRANSCRITO") {
      return {
        status: 403,
        error: "ASO só pode ser registrado por transcrição auditada pela empresa.",
      };
    }
    if (!input.physicianName?.trim() || !input.physicianCrm?.trim()) {
      return {
        status: 400,
        error: "Nome e CRM do médico obrigatórios para transcrição.",
      };
    }
  }

  return null;
}

export function validatePhysicianExamPatch(
  existing: ExamAsoState,
  input: EmployerExamPatchInput,
): PatchValidationError | null {
  const asoEmitted = isAsoEmitted(existing);

  if (asoEmitted && !input.rectify) {
    return { status: 409, error: "Exame já concluído. Use retificação." };
  }

  if (input.rectify && !input.notes?.trim()) {
    return { status: 400, error: "Justificativa obrigatória para retificação." };
  }

  const effectiveAsoResult =
    input.asoResult !== undefined ? input.asoResult : existing.asoResult;

  if (effectiveAsoResult === "APTO_COM_RESTRICAO") {
    const restrictions =
      input.asoRestrictions !== undefined
        ? input.asoRestrictions?.trim()
        : existing.asoRestrictions?.trim();
    if (!restrictions) {
      return {
        status: 400,
        error: "Restrições obrigatórias para apto com restrição.",
      };
    }
  }

  return null;
}
