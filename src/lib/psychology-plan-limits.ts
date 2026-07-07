// Freemium limits for psychologist portal (Doctor Connection Pro unlocks all).

import { db } from "@/lib/db";
import { isPsychologistSpecialty } from "@/lib/psychologist-portal";

export const PSYCHOLOGY_FREE_PATIENT_LIMIT = 3;

export type PsychologyPlanTier = "free" | "pro";

export async function getPsychologyPlanTier(userId: string, specialty: string): Promise<PsychologyPlanTier> {
  if (!isPsychologistSpecialty(specialty)) return "pro";

  const sub = await db.subscription.findUnique({
    where: { userId },
    select: { status: true },
  });
  if (sub && ["active", "trialing"].includes(sub.status)) return "pro";
  return "free";
}

export async function countPsychologistPatients(professionalId: string): Promise<number> {
  return db.patientRecord.count({ where: { professionalId } });
}

export async function assertCanAddPsychologyPatient(
  userId: string,
  professionalId: string,
  specialty: string,
): Promise<{ ok: true } | { ok: false; code: string; limit: number; current: number }> {
  const tier = await getPsychologyPlanTier(userId, specialty);
  if (tier === "pro") return { ok: true };

  const current = await countPsychologistPatients(professionalId);
  if (current >= PSYCHOLOGY_FREE_PATIENT_LIMIT) {
    return {
      ok: false,
      code: "PSYCHOLOGY_PLAN_LIMIT",
      limit: PSYCHOLOGY_FREE_PATIENT_LIMIT,
      current,
    };
  }
  return { ok: true };
}

export const PSYCHOLOGY_PLANS = {
  free: {
    priceBrl: 0,
    patients: 3,
    aiNotes: true,
    scales: true,
    anamnesis: true,
    jit: false,
    chartChat: false,
    googleCalendar: false,
  },
  pro: {
    priceBrl: 79,
    patients: null as number | null,
    aiNotes: true,
    scales: true,
    anamnesis: true,
    jit: true,
    chartChat: true,
    googleCalendar: true,
  },
  clinic: {
    priceBrl: 149,
    patients: null as number | null,
    professionals: 5,
    aiNotes: true,
    scales: true,
    anamnesis: true,
    jit: true,
    chartChat: true,
    googleCalendar: true,
  },
} as const;
