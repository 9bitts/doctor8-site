// Maps platform providers to the Doctor8 professional-kind taxonomy for Club stamps.

import type { ProfessionalKind, ProviderType as ApptProviderType } from "@prisma/client";
import { getProfessionInfo } from "@/lib/profession-label";

export const STAMPS_FOR_FREE_MONTH = 10;
export const DIVERSITY_KINDS_REQUIRED = 3;
export const DIVERSITY_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;

const TYPE_KEY_TO_KIND: Record<string, ProfessionalKind> = {
  doctor: "MEDICINE",
  psychologist: "PSYCHOLOGY",
  nutritionist: "NUTRITION",
  physiotherapist: "PHYSIOTHERAPY",
  nurse: "NURSING",
  dentist: "DENTISTRY",
  professional: "OTHER",
};

export function kindFromHealthSpecialty(specialty: string | null | undefined): ProfessionalKind {
  if (!specialty) return "OTHER";
  const key = getProfessionInfo(specialty).typeKey;
  return TYPE_KEY_TO_KIND[key] ?? "OTHER";
}

export function kindFromAppointment(
  providerType: ApptProviderType,
  specialty?: string | null,
): ProfessionalKind {
  if (providerType === "PSYCHOANALYST") return "PSYCHOANALYSIS";
  return kindFromHealthSpecialty(specialty);
}

export const KIND_LABELS: Record<ProfessionalKind, string> = {
  MEDICINE: "Medicina",
  PSYCHOLOGY: "Psicologia",
  PSYCHOANALYSIS: "Psicanalise",
  DENTISTRY: "Odontologia",
  PHYSIOTHERAPY: "Fisioterapia",
  NUTRITION: "Nutricao",
  NURSING: "Enfermagem",
  INTEGRATIVE: "Terapias integrativas",
  OTHER: "Outros",
};
