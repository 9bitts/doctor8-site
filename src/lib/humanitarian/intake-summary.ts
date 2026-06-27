import type { HumanitarianIntake } from "@prisma/client";
import type { HumanitarianTriageData } from "@/lib/humanitarian/triage";
import type {
  BasicNeedsData,
  IdentificationData,
  SpecialtyData,
} from "@/lib/humanitarian/anamnese";

export type IntakeSummarySection = {
  title: string;
  items: { label: string; value: string }[];
};

const TRIAGE_LABELS: Record<string, string> = {
  gestante_lactante: "Gestante/lactante",
  idade_65_mais: "65+ anos",
  deficiencia_mobilidade: "Defici?ncia/mobilidade",
  crianca_menor_12: "Crian?a <12",
  doenca_cronica: "Doen?a cr?nica",
  sem_acesso_medicamentos: "Sem medicamentos",
  autolesao: "Autoles?o",
  sangramento_ativo: "Sangramento ativo",
  dor_peito_dispneia: "Dor peito/dispneia",
  respiracao_muito_dificil: "Respira??o muito dif?cil",
  consciencia_sonolento: "Sonolento",
  trauma_cabeca: "Trauma cabe?a",
};

function yesNo(v: boolean | undefined | null, lang = "es"): string {
  if (v == null) return "?";
  if (lang.startsWith("pt")) return v ? "Sim" : "N?o";
  if (lang.startsWith("en")) return v ? "Yes" : "No";
  return v ? "S?" : "No";
}

function str(v: unknown): string {
  if (v == null || v === "") return "?";
  if (typeof v === "boolean") return v ? "S?" : "No";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "?";
  return String(v);
}

export function buildIntakeSummary(
  intake: Pick<
    HumanitarianIntake,
    | "triageData"
    | "computedPriority"
    | "triageFlags"
    | "forceMedicalPool"
    | "status"
    | "identificationData"
    | "serviceTypes"
    | "specialtyData"
    | "basicNeedsData"
    | "additionalNotes"
    | "consentAt"
  >,
  lang = "es",
): {
  priority: string | null;
  status: string;
  anamneseComplete: boolean;
  sections: IntakeSummarySection[];
} {
  const sections: IntakeSummarySection[] = [];
  const triage = intake.triageData as HumanitarianTriageData | null;
  const id = intake.identificationData as IdentificationData | null;
  const specialty = intake.specialtyData as SpecialtyData | null;
  const needs = intake.basicNeedsData as BasicNeedsData | null;

  if (triage) {
    sections.push({
      title: lang.startsWith("pt") ? "Triagem r?pida" : lang.startsWith("en") ? "Quick triage" : "Triaje r?pido",
      items: [
        { label: "Prioridad", value: intake.computedPriority || "?" },
        ...(intake.triageFlags.length
          ? [{ label: "Flags", value: intake.triageFlags.map((f) => TRIAGE_LABELS[f] || f).join(" ? ") }]
          : []),
        { label: lang.startsWith("pt") ? "Caminhar" : "Caminar", value: triage.walking },
        { label: lang.startsWith("pt") ? "Respira??o" : "Respiraci?n", value: triage.breathing },
        { label: lang.startsWith("pt") ? "Consci?ncia" : "Consciencia", value: triage.consciousness },
        { label: "Sangramento", value: yesNo(triage.activeBleeding, lang) },
        { label: "Dor peito/dispneia", value: yesNo(triage.chestPainOrSevereDyspnea, lang) },
        { label: "Febre/GI", value: yesNo(triage.feverOrGi, lang) },
        { label: "Trauma cabe?a", value: yesNo(triage.headTrauma, lang) },
        { label: "Autolesi?n", value: yesNo(triage.selfHarmThoughts, lang) },
        ...(triage.headTraumaDescription
          ? [{ label: "Trauma (detalle)", value: triage.headTraumaDescription }]
          : []),
      ],
    });
  }

  if (id && Object.keys(id).some((k) => (id as Record<string, unknown>)[k])) {
    sections.push({
      title: lang.startsWith("pt") ? "Identifica??o" : lang.startsWith("en") ? "Identification" : "Identificaci?n",
      items: [
        { label: "Nombre", value: str(id.fullName) },
        { label: "Edad/DOB", value: str(id.ageOrDob) },
        { label: "Tel?fono", value: str(id.phone) },
        { label: "Ubicaci?n", value: [id.state, id.municipality].filter(Boolean).join(", ") || "?" },
        { label: "Abrigo/casa", value: str(id.shelterStatus) },
        { label: "Vivienda", value: str(id.housingDamage) },
        { label: "Acceso b?sico", value: str(id.accessWaterFoodMeds) },
        { label: "Fallecidos/desaparecidos", value: yesNo(id.deathsOrMissing, lang) },
      ].filter((i) => i.value !== "?"),
    });
  }

  if (intake.serviceTypes.length > 0) {
    sections.push({
      title: lang.startsWith("pt") ? "Atendimentos" : lang.startsWith("en") ? "Services" : "Atenciones",
      items: [{ label: "Tipos", value: intake.serviceTypes.join(", ") }],
    });
  }

  if (specialty?.medico) {
    sections.push({
      title: "M?dico",
      items: [
        { label: "Motivo", value: str(specialty.medico.chiefReason) },
        { label: "S?ntomas", value: str(specialty.medico.physicalSymptoms) },
        { label: "Medicamentos", value: str(specialty.medico.medications) },
      ].filter((i) => i.value !== "?"),
    });
  }

  if (specialty?.psicologo) {
    sections.push({
      title: "Psic?logo",
      items: [
        { label: "Escala 0-10", value: str(specialty.psicologo.emotionalScale) },
        { label: "S?ntomas", value: str(specialty.psicologo.emotionalSymptoms) },
      ].filter((i) => i.value !== "?"),
    });
  }

  if (specialty?.psicanalista?.reason) {
    sections.push({
      title: "Psicanalista",
      items: [{ label: "Motivo", value: specialty.psicanalista.reason }],
    });
  }

  if (needs) {
    sections.push({
      title: lang.startsWith("pt") ? "Necessidades" : lang.startsWith("en") ? "Basic needs" : "Necesidades",
      items: [
        { label: "Medicamentos", value: yesNo(needs.needsMedicationHelp, lang) },
        { label: "Abrigo/social", value: yesNo(needs.needsShelterGuidance, lang) },
        { label: "Separado/sozinho", value: yesNo(needs.separatedChildOrElderlyAlone, lang) },
      ],
    });
  }

  if (intake.additionalNotes) {
    sections.push({
      title: "Notas",
      items: [{ label: "", value: intake.additionalNotes }],
    });
  }

  return {
    priority: intake.computedPriority,
    status: intake.status,
    anamneseComplete: intake.status === "COMPLETE",
    sections,
  };
}
