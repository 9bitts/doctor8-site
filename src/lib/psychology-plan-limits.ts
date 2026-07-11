// Freemium limits for psychologist portal (Doctor Connection Pro unlocks all).

import { db } from "@/lib/db";
import { isPsychologistSpecialty } from "@/lib/psychologist-portal";

export const PSYCHOLOGY_FREE_PATIENT_LIMIT = 3;

export type PsychologyPlanTier = "free" | "pro";

export async function getPsychologyPlanTier(userId: string, specialty: string): Promise<PsychologyPlanTier> {
  if (!isPsychologistSpecialty(specialty)) return "pro";

  // PSI-13: Subscription is 1:1 per user (Doctor Connection / Club Doctor). Any active
  // subscription unlocks psychology Pro — stripePriceId is not filtered here. If other
  // products share this table later, add price/product guard before treating as Pro.
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

// Prontuário criado por agendamento confirmado (ensurePatientRecord via
// onAppointmentBooked) ignora o limite free; o limite vale só para adição
// manual em /api/professional/records e import.
export async function assertCanAddPsychologyPatient(
  userId: string,
  professionalId: string,
  specialty: string,
  addingCount = 1,
): Promise<
  | { ok: true }
  | { ok: false; code: string; limit: number; current: number; remaining: number }
> {
  const tier = await getPsychologyPlanTier(userId, specialty);
  if (tier === "pro") return { ok: true };

  const current = await countPsychologistPatients(professionalId);
  const remaining = Math.max(0, PSYCHOLOGY_FREE_PATIENT_LIMIT - current);
  if (current + addingCount > PSYCHOLOGY_FREE_PATIENT_LIMIT) {
    return {
      ok: false,
      code: "PSYCHOLOGY_PLAN_LIMIT",
      limit: PSYCHOLOGY_FREE_PATIENT_LIMIT,
      current,
      remaining,
    };
  }
  return { ok: true };
}

/** Gate Pro-only psychology features (JIT, Google Calendar, etc.) for free-tier psychologists. */
export async function assertPsychologyProFeature(
  userId: string,
  specialty: string,
): Promise<{ ok: true } | { ok: false; code: "PSYCHOLOGY_PLAN_REQUIRED" }> {
  if (!isPsychologistSpecialty(specialty)) return { ok: true };
  const tier = await getPsychologyPlanTier(userId, specialty);
  if (tier === "pro") return { ok: true };
  return { ok: false, code: "PSYCHOLOGY_PLAN_REQUIRED" };
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
