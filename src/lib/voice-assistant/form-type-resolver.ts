import type { VoicePortalId, VoiceFormType, ParsedVoiceIntent } from "./types";
import { resolveSkillRoute } from "./skill-registry";

export function resolveFormType(
  portalId: VoicePortalId,
  intent: ParsedVoiceIntent,
): VoiceFormType | null {
  const route = intent.targetRoute || resolveSkillRoute(portalId, intent.skillId) || "";

  if (intent.skillId === "sbar_note") return "sbar";
  if (intent.skillId === "med_review") return "med_review";

  if (intent.skillId === "anamnesis") {
    if (portalId === "NUTRITIONIST") return "nutrition_anamnesis";
    if (portalId === "DENTIST") return "dental_anamnesis";
  }

  if (intent.skillId === "clinical_note") {
    if (portalId === "PSYCHOLOGIST") return "session_note";
    if (portalId === "NURSE" && route.includes("prescricao")) return "care_plan";
    if (portalId === "NURSE") return "care_plan";
    if (portalId === "PHARMACIST" && route.includes("conciliacao")) return "reconciliation";
    if (portalId === "PHARMACIST") return "med_review";
    if (portalId === "DENTIST" && route.includes("plano-tratamento")) return "treatment_plan";
    if (portalId === "PROFESSIONAL" || portalId === "DENTIST") return "chart_evolution";
  }

  return null;
}

export function formRouteForType(portalId: VoicePortalId, formType: VoiceFormType): string {
  switch (formType) {
    case "sbar":
      return "/enfermeiro/sbar";
    case "care_plan":
      return "/enfermeiro/prescricao";
    case "med_review":
      return "/farmaceutico/revisao";
    case "reconciliation":
      return "/farmaceutico/conciliacao";
    case "session_note":
      return portalId === "PSYCHOLOGIST" ? "/psychologist/sessions" : "/professional/psychology/sessions";
    case "nutrition_anamnesis":
      return "/nutricionista/anamnese";
    case "dental_anamnesis":
      return "/odontologo/anamnese";
    case "treatment_plan":
      return "/odontologo/plano-tratamento";
    case "chart_evolution":
      return "/professional/patients";
    default:
      return resolveSkillRoute(portalId, "clinical_note") || "/professional";
  }
}
