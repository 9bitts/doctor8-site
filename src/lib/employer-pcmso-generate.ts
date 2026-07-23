import type { EmployerExamType } from "@prisma/client";
import { db } from "@/lib/db";
import {
  parseExamMatrix,
  type PcmsoExamMatrixRow,
} from "@/lib/employer-pcmso-exam-matrix";
import {
  PSYCHOSOCIAL_QUESTIONNAIRE_EXAM,
  suggestedExamsFromRiskCodes,
} from "@/lib/employer-risk-catalog";

const MATRIX_TO_EXAM_TYPE: Array<{
  key: "admissional" | "periodico" | "retorno" | "demissional";
  examType: EmployerExamType;
}> = [
  { key: "admissional", examType: "ADMISSIONAL" },
  { key: "periodico", examType: "PERIODICO" },
  { key: "retorno", examType: "RETORNO_TRABALHO" },
  { key: "demissional", examType: "DEMISSIONAL" },
];

function periodicityMonths(periodicity: string): number {
  const p = periodicity.toLowerCase();
  if (p.includes("bien")) return 24;
  if (p.includes("semestr")) return 6;
  if (p.includes("trimestr")) return 3;
  return 12;
}

/** Build / refresh a PCMSO matrix row from GHE + its risk hazard codes. */
export function buildMatrixRowFromGhe(input: {
  gheId: string;
  gheName: string;
  sector: string;
  functionName: string;
  hazardCodes: string[];
  existing?: PcmsoExamMatrixRow | null;
}): PcmsoExamMatrixRow {
  const examNames = suggestedExamsFromRiskCodes(input.hazardCodes);
  if (!examNames.includes(PSYCHOSOCIAL_QUESTIONNAIRE_EXAM)) {
    examNames.push(PSYCHOSOCIAL_QUESTIONNAIRE_EXAM);
  }

  const existingByName = new Map(
    (input.existing?.exams ?? []).map((e) => [e.name.toLowerCase(), e]),
  );

  return {
    id: input.existing?.id ?? `ghe_${input.gheId}`,
    gheName: input.gheName,
    sector: input.sector,
    functionName: input.functionName,
    gheGroupId: input.gheId,
    exams: examNames.map((name) => {
      const prev = existingByName.get(name.toLowerCase());
      const isPsycho = name === PSYCHOSOCIAL_QUESTIONNAIRE_EXAM;
      return {
        name,
        admissional: prev?.admissional ?? !isPsycho,
        periodico: prev?.periodico ?? true,
        retorno: prev?.retorno ?? false,
        demissional: prev?.demissional ?? name === "Exame clínico",
        periodicity: prev?.periodicity ?? (name.includes("Raio") || name.includes("Espirometria") ? "Bienal" : "Anual"),
      };
    }),
  };
}

/** Schedule occupational exams for workforce members in a GHE from the PCMSO matrix. */
export async function generateExamsFromMatrix(input: {
  employerCompanyId: string;
  gheGroupId?: string;
  examTypes?: EmployerExamType[];
}): Promise<{ created: number; skipped: number }> {
  const config = await db.employerPcmsoConfig.findUnique({
    where: { employerCompanyId: input.employerCompanyId },
    select: { examMatrixJson: true },
  });
  const matrix = parseExamMatrix(config?.examMatrixJson);

  const members = await db.employerWorkforceMember.findMany({
    where: {
      employerCompanyId: input.employerCompanyId,
      status: { in: ["ACTIVE", "INVITED"] },
      ...(input.gheGroupId ? { gheGroupId: input.gheGroupId } : {}),
    },
    select: {
      id: true,
      gheGroupId: true,
      jobTitle: true,
      department: true,
      gheGroup: { select: { id: true, name: true } },
    },
  });

  const gheGroups = await db.employerGheGroup.findMany({
    where: { employerCompanyId: input.employerCompanyId },
    select: { id: true, name: true },
  });
  const gheByName = new Map(gheGroups.map((g) => [g.name.toLowerCase(), g.id]));

  let created = 0;
  let skipped = 0;
  const allowedTypes = input.examTypes ?? (["ADMISSIONAL", "PERIODICO"] as EmployerExamType[]);

  for (const member of members) {
    const row =
      matrix.find((r) => r.gheGroupId && r.gheGroupId === member.gheGroupId) ||
      matrix.find(
        (r) =>
          member.gheGroup &&
          r.gheName.toLowerCase() === member.gheGroup.name.toLowerCase(),
      ) ||
      matrix.find((r) => {
        const gid = gheByName.get(r.gheName.toLowerCase());
        return gid && gid === member.gheGroupId;
      }) ||
      matrix[0];

    if (!row) {
      skipped += 1;
      continue;
    }

    for (const exam of row.exams) {
      for (const mapping of MATRIX_TO_EXAM_TYPE) {
        if (!allowedTypes.includes(mapping.examType)) continue;
        const enabled =
          mapping.key === "admissional"
            ? exam.admissional
            : mapping.key === "periodico"
              ? exam.periodico
              : mapping.key === "retorno"
                ? Boolean(exam.retorno)
                : exam.demissional;
        if (!enabled) continue;

        const existing = await db.employerOccupationalExam.findFirst({
          where: {
            employerCompanyId: input.employerCompanyId,
            workforceMemberId: member.id,
            examType: mapping.examType,
            protocolExamName: exam.name,
            status: { in: ["SCHEDULED", "IN_PROGRESS"] },
          },
          select: { id: true },
        });
        if (existing) {
          skipped += 1;
          continue;
        }

        const months = periodicityMonths(exam.periodicity);
        const due = new Date();
        if (mapping.examType === "PERIODICO") {
          due.setMonth(due.getMonth() + months);
        } else {
          due.setDate(due.getDate() + 30);
        }

        await db.employerOccupationalExam.create({
          data: {
            employerCompanyId: input.employerCompanyId,
            workforceMemberId: member.id,
            examType: mapping.examType,
            protocolExamName: exam.name,
            dueDate: due,
            notes: `Gerado da matriz PCMSO — ${row.gheName}`,
          },
        });
        created += 1;
      }
    }
  }

  return { created, skipped };
}
