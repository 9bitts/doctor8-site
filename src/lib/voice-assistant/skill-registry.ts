import {
  PLATFORM_NAV_BY_PORTAL,
  type PlatformPortalId,
} from "@/lib/platform-nav-registry";
import {
  appointmentsRouteForPortal,
  patientsRouteForPortal,
  prescriptionsRouteForPortal,
} from "./portal-resolver";
import type { VoicePortalId, VoiceSkill } from "./types";

const BASE_SKILLS: Partial<Record<VoicePortalId, VoiceSkill[]>> = {
  PROFESSIONAL: [
    {
      id: "prescribe",
      labelKey: "voice.skill.prescribe",
      route: "/professional/prescriptions",
      description: "Create or prefill a prescription for a patient",
      examples: [
        "Receita para Maria Silva, losartana 50 mg pela manhã",
        "Prescrever amoxicilina 500 mg de 8 em 8 horas por 7 dias para João",
      ],
    },
    {
      id: "exam_request",
      labelKey: "voice.skill.examRequest",
      route: "/professional/prescriptions",
      description: "Create or prefill a lab/imaging exam request",
      examples: [
        "Pedido de exame para Maria Silva, hemograma e glicemia",
        "Solicitar ressonância de joelho para o paciente Carlos",
      ],
    },
    {
      id: "clinical_document",
      labelKey: "voice.skill.clinicalDocument",
      route: "/professional/prescriptions",
      description: "Create or prefill a medical certificate, report or document",
      examples: [
        "Atestado para João, afastamento de 3 dias por gripe",
        "Laudo médico para Ana com resumo da consulta de hoje",
      ],
    },
    {
      id: "clinical_note",
      labelKey: "voice.skill.clinicalNote",
      description: "Draft a consultation evolution note from spoken content",
      examples: [
        "Evolução da consulta de hoje com Ana, queixa de dor lombar há 3 dias",
        "Registrar evolução do paciente Carlos",
      ],
    },
    {
      id: "navigate",
      labelKey: "voice.skill.navigate",
      description: "Open a tool or section in the portal",
      examples: ["Abrir receitas", "Ir para agenda", "Abrir mensagens"],
    },
    {
      id: "search_patient",
      labelKey: "voice.skill.searchPatient",
      route: "/professional/patients",
      description: "Find a patient chart",
      examples: ["Buscar paciente Maria Silva", "Abrir ficha do João"],
    },
    {
      id: "schedule",
      labelKey: "voice.skill.schedule",
      route: "/professional/appointments",
      description: "Open scheduling or mention an appointment",
      examples: ["Agendar retorno sexta às 14h", "Abrir agenda"],
    },
  ],
  PSYCHOLOGIST: [
    {
      id: "clinical_note",
      labelKey: "voice.skill.sessionNote",
      route: "/psychologist/sessions",
      description: "Draft a psychology session note",
      examples: ["Registrar sessão de hoje com João, foco em ansiedade social"],
    },
    {
      id: "anamnesis",
      labelKey: "voice.skill.anamnesis",
      route: "/psychologist/anamnesis",
      description: "Open or draft psychological anamnesis",
      examples: ["Abrir anamnese da paciente Ana"],
    },
    { id: "navigate", labelKey: "voice.skill.navigate", description: "Open a portal section", examples: ["Abrir sessões", "Ir para escalas"] },
    { id: "search_patient", labelKey: "voice.skill.searchPatient", route: "/psychologist/patients", description: "Find a patient", examples: ["Buscar paciente Maria"] },
    { id: "schedule", labelKey: "voice.skill.schedule", route: "/psychologist/appointments", description: "Open appointments", examples: ["Abrir agenda"] },
  ],
  NUTRITIONIST: [
    { id: "anamnesis", labelKey: "voice.skill.anamnesis", route: "/nutricionista/anamnese", description: "Nutrition anamnesis", examples: ["Anamnese nutricional da paciente Ana"] },
    { id: "meal_plan", labelKey: "voice.skill.mealPlan", route: "/nutricionista/planos", description: "Create or prefill a meal plan", examples: ["Plano alimentar do João, 1800 kcal, café da manhã com ovos e fruta", "Dieta hipoproteica para Ana, almoço com frango e arroz"] },
    { id: "navigate", labelKey: "voice.skill.navigate", description: "Open a portal section", examples: ["Abrir antropometria"] },
    { id: "search_patient", labelKey: "voice.skill.searchPatient", route: "/nutricionista/patients", description: "Find a patient", examples: ["Buscar paciente Carlos"] },
    { id: "schedule", labelKey: "voice.skill.schedule", route: "/nutricionista/appointments", description: "Open appointments", examples: ["Abrir agenda"] },
  ],
  NURSE: [
    { id: "sbar_note", labelKey: "voice.skill.sbar", route: "/enfermeiro/sbar", description: "SBAR handoff note", examples: ["SBAR da paciente Ana, saturação 92%"] },
    { id: "clinical_note", labelKey: "voice.skill.carePlan", route: "/enfermeiro/prescricao", description: "Care plan documentation", examples: ["Plano de cuidados para o paciente João"] },
    { id: "navigate", labelKey: "voice.skill.navigate", description: "Open a portal section", examples: ["Abrir SAE", "Abrir checagem"] },
    { id: "search_patient", labelKey: "voice.skill.searchPatient", route: "/enfermeiro/patients", description: "Find a patient", examples: ["Buscar paciente Maria"] },
    { id: "schedule", labelKey: "voice.skill.schedule", route: "/enfermeiro/appointments", description: "Open appointments", examples: ["Abrir agenda"] },
  ],
  PHARMACIST: [
    { id: "med_review", labelKey: "voice.skill.medReview", route: "/farmaceutico/revisao", description: "Medication review", examples: ["Revisão medicamentosa do paciente João"] },
    { id: "clinical_note", labelKey: "voice.skill.reconciliation", route: "/farmaceutico/conciliacao", description: "Medication reconciliation note", examples: ["Conciliação medicamentosa da paciente Ana"] },
    { id: "navigate", labelKey: "voice.skill.navigate", description: "Open a portal section", examples: ["Abrir interações", "Abrir dispensação"] },
    { id: "search_patient", labelKey: "voice.skill.searchPatient", route: "/farmaceutico/patients", description: "Find a patient", examples: ["Buscar paciente Carlos"] },
    { id: "schedule", labelKey: "voice.skill.schedule", route: "/farmaceutico/appointments", description: "Open appointments", examples: ["Abrir agenda"] },
  ],
  DENTIST: [
    {
      id: "prescribe",
      labelKey: "voice.skill.prescribe",
      route: "/odontologo/prescriptions",
      description: "Create or prefill a prescription",
      examples: ["Receita para Maria, amoxicilina 500 mg de 8 em 8 horas"],
    },
    { id: "anamnesis", labelKey: "voice.skill.anamnesis", route: "/odontologo/anamnese", description: "Dental anamnesis", examples: ["Anamnese odontológica do paciente João"] },
    { id: "clinical_note", labelKey: "voice.skill.treatmentPlan", route: "/odontologo/plano-tratamento", description: "Treatment plan note", examples: ["Plano de tratamento para restauração do dente 16"] },
    { id: "navigate", labelKey: "voice.skill.navigate", description: "Open a portal section", examples: ["Abrir odontograma"] },
    { id: "search_patient", labelKey: "voice.skill.searchPatient", route: "/odontologo/patients", description: "Find a patient", examples: ["Buscar paciente Ana"] },
    { id: "schedule", labelKey: "voice.skill.schedule", route: "/odontologo/appointments", description: "Open appointments", examples: ["Abrir agenda"] },
  ],
  PSYCHOANALYST: [
    { id: "clinical_note", labelKey: "voice.skill.sessionNote", description: "Draft session notes", examples: ["Notas da sessão de hoje com o analisando João"] },
    { id: "navigate", labelKey: "voice.skill.navigate", description: "Open a portal section", examples: ["Abrir analisandos", "Abrir agenda"] },
    { id: "schedule", labelKey: "voice.skill.schedule", route: "/psychoanalyst/appointments", description: "Open appointments", examples: ["Abrir agenda"] },
  ],
  INTEGRATIVE_THERAPIST: [
    {
      id: "prescribe",
      labelKey: "voice.skill.prescribe",
      route: "/integrative-therapist/prescriptions",
      description: "Create phytotherapy / floral prescription",
      examples: ["Receita fitoterápica para Maria, valeriana"],
    },
    { id: "navigate", labelKey: "voice.skill.navigate", description: "Open a portal section", examples: ["Abrir chás Seu Enésio", "Abrir florais"] },
    { id: "search_patient", labelKey: "voice.skill.searchPatient", route: "/integrative-therapist/clients", description: "Find a client", examples: ["Buscar cliente João"] },
    { id: "schedule", labelKey: "voice.skill.schedule", route: "/integrative-therapist/appointments", description: "Open appointments", examples: ["Abrir agenda"] },
  ],
};

export function getSkillsForPortal(portalId: VoicePortalId): VoiceSkill[] {
  return BASE_SKILLS[portalId] ?? [];
}

export function buildNavigationIndex(portalId: VoicePortalId): Array<{ href: string; labelKey: string }> {
  const nav = PLATFORM_NAV_BY_PORTAL[portalId as PlatformPortalId] ?? [];
  return nav.map((item) => ({ href: item.href, labelKey: item.labelKey }));
}

export function resolveSkillRoute(portalId: VoicePortalId, skillId: string): string | undefined {
  const skill = getSkillsForPortal(portalId).find((s) => s.id === skillId);
  if (skill?.route) return skill.route;
  if (skillId === "prescribe") return prescriptionsRouteForPortal(portalId);
  if (skillId === "search_patient") return patientsRouteForPortal(portalId);
  if (skillId === "schedule") return appointmentsRouteForPortal(portalId);
  return undefined;
}
