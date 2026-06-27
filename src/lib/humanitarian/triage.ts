import { z } from "zod";
import type { HumanitarianPriority } from "@prisma/client";

export const TRIAGE_VALIDITY_MS = 24 * 60 * 60 * 1000;

export const triageWalkingSchema = z.enum(["sim", "dificuldade", "nao"]);
export const triageBreathingSchema = z.enum(["normal", "ofegante", "muito_dificil"]);
export const triageConsciousnessSchema = z.enum(["alerta", "confuso", "sonolento"]);

export const humanitarianTriageSchema = z.object({
  pregnantOrLactating: z.boolean(),
  age65Plus: z.boolean(),
  disabilityOrReducedMobility: z.boolean(),
  childUnder12Responsible: z.boolean(),
  chronicDiseaseNeedsMeds: z.boolean(),
  lostMedicationAccess: z.boolean(),
  walking: triageWalkingSchema,
  breathing: triageBreathingSchema,
  consciousness: triageConsciousnessSchema,
  activeBleeding: z.boolean(),
  chestPainOrSevereDyspnea: z.boolean(),
  feverOrGi: z.boolean(),
  headTrauma: z.boolean(),
  headTraumaDescription: z.string().max(500).optional(),
  selfHarmThoughts: z.boolean(),
});

export type HumanitarianTriageData = z.infer<typeof humanitarianTriageSchema>;

export interface TriageResult {
  priority: HumanitarianPriority;
  forceMedicalPool: boolean;
  flags: string[];
}

export function isTriageValid(triageCompletedAt: Date | null | undefined): boolean {
  if (!triageCompletedAt) return false;
  return Date.now() - triageCompletedAt.getTime() < TRIAGE_VALIDITY_MS;
}

export function triageExpiresAt(triageCompletedAt: Date): Date {
  return new Date(triageCompletedAt.getTime() + TRIAGE_VALIDITY_MS);
}

export function computeTriagePriority(data: HumanitarianTriageData): TriageResult {
  const flags: string[] = [];

  if (data.pregnantOrLactating) flags.push("gestante_lactante");
  if (data.age65Plus) flags.push("idade_65_mais");
  if (data.disabilityOrReducedMobility) flags.push("deficiencia_mobilidade");
  if (data.childUnder12Responsible) flags.push("crianca_menor_12");
  if (data.chronicDiseaseNeedsMeds) flags.push("doenca_cronica");
  if (data.lostMedicationAccess) flags.push("sem_acesso_medicamentos");

  const physicalCrisis =
    data.consciousness === "sonolento" ||
    data.breathing === "muito_dificil" ||
    data.activeBleeding ||
    data.chestPainOrSevereDyspnea;

  if (data.selfHarmThoughts) flags.push("autolesao");
  if (data.activeBleeding) flags.push("sangramento_ativo");
  if (data.chestPainOrSevereDyspnea) flags.push("dor_peito_dispneia");
  if (data.breathing === "muito_dificil") flags.push("respiracao_muito_dificil");
  if (data.consciousness === "sonolento") flags.push("consciencia_sonolento");
  if (data.headTrauma) flags.push("trauma_cabeca");

  if (physicalCrisis || data.selfHarmThoughts) {
    return {
      priority: "CRISIS",
      forceMedicalPool: physicalCrisis,
      flags,
    };
  }

  const urgent =
    data.walking === "nao" ||
    data.breathing === "ofegante" ||
    data.consciousness === "confuso" ||
    data.feverOrGi ||
    data.headTrauma ||
    data.lostMedicationAccess;

  if (urgent) {
    return { priority: "URGENT", forceMedicalPool: false, flags };
  }

  const vulnerabilityBump =
    data.pregnantOrLactating ||
    data.age65Plus ||
    data.disabilityOrReducedMobility ||
    data.childUnder12Responsible ||
    data.chronicDiseaseNeedsMeds;

  return {
    priority: vulnerabilityBump ? "URGENT" : "ROUTINE",
    forceMedicalPool: false,
    flags,
  };
}
