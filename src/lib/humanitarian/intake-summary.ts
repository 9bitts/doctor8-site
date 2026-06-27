import type { HumanitarianIntake } from "@prisma/client";
import type { Lang } from "@/lib/i18n/translations";
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

export const VULNERABILITY_FLAGS = [
  "gestante_lactante",
  "idade_65_mais",
  "deficiencia_mobilidade",
  "crianca_menor_12",
  "doenca_cronica",
  "sem_acesso_medicamentos",
] as const;

const TRIAGE_FLAG_LABELS: Record<Lang, Record<string, string>> = {
  pt: {
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
  },
  en: {
    gestante_lactante: "Pregnant/lactating",
    idade_65_mais: "Age 65+",
    deficiencia_mobilidade: "Disability/mobility",
    crianca_menor_12: "Child <12",
    doenca_cronica: "Chronic disease",
    sem_acesso_medicamentos: "No medication access",
    autolesao: "Self-harm",
    sangramento_ativo: "Active bleeding",
    dor_peito_dispneia: "Chest pain/dyspnea",
    respiracao_muito_dificil: "Severe breathing difficulty",
    consciencia_sonolento: "Drowsy",
    trauma_cabeca: "Head trauma",
  },
  es: {
    gestante_lactante: "Gestante/lactante",
    idade_65_mais: "65+ a?os",
    deficiencia_mobilidade: "Discapacidad/movilidad",
    crianca_menor_12: "Ni?o <12",
    doenca_cronica: "Enfermedad cr?nica",
    sem_acesso_medicamentos: "Sin medicamentos",
    autolesao: "Autolesi?n",
    sangramento_ativo: "Sangrado activo",
    dor_peito_dispneia: "Dolor pecho/disnea",
    respiracao_muito_dificil: "Respiraci?n muy dif?cil",
    consciencia_sonolento: "Somnoliento",
    trauma_cabeca: "Trauma cabeza",
  },
};

const L: Record<
  Lang,
  {
    empty: string;
    triage: string;
    priority: string;
    flags: string;
    walking: string;
    breathing: string;
    consciousness: string;
    bleeding: string;
    chestPain: string;
    feverGi: string;
    headTrauma: string;
    selfHarm: string;
    traumaDetail: string;
    identification: string;
    name: string;
    ageDob: string;
    phone: string;
    location: string;
    shelter: string;
    housing: string;
    basicAccess: string;
    deathsMissing: string;
    services: string;
    types: string;
    medico: string;
    reason: string;
    symptoms: string;
    medications: string;
    psicologo: string;
    scale: string;
    psicanalista: string;
    needs: string;
    shelterSocial: string;
    separatedAlone: string;
    notes: string;
    yes: string;
    no: string;
    unknown: string;
  }
> = {
  pt: {
    empty: "?",
    triage: "Triagem r?pida",
    priority: "Prioridade",
    flags: "Flags",
    walking: "Caminhar",
    breathing: "Respira??o",
    consciousness: "Consci?ncia",
    bleeding: "Sangramento",
    chestPain: "Dor peito/dispneia",
    feverGi: "Febre/GI",
    headTrauma: "Trauma cabe?a",
    selfHarm: "Autoles?o",
    traumaDetail: "Trauma (detalhe)",
    identification: "Identifica??o",
    name: "Nome",
    ageDob: "Idade/nasc.",
    phone: "Telefone",
    location: "Localiza??o",
    shelter: "Abrigo/casa",
    housing: "Moradia",
    basicAccess: "Acesso b?sico",
    deathsMissing: "Mortos/desaparecidos",
    services: "Atendimentos",
    types: "Tipos",
    medico: "M?dico",
    reason: "Motivo",
    symptoms: "Sintomas",
    medications: "Medicamentos",
    psicologo: "Psic?logo",
    scale: "Escala 0-10",
    psicanalista: "Psicanalista",
    needs: "Necessidades",
    shelterSocial: "Abrigo/social",
    separatedAlone: "Separado/sozinho",
    notes: "Notas",
    yes: "Sim",
    no: "N?o",
    unknown: "?",
  },
  en: {
    empty: "?",
    triage: "Quick triage",
    priority: "Priority",
    flags: "Flags",
    walking: "Walking",
    breathing: "Breathing",
    consciousness: "Consciousness",
    bleeding: "Bleeding",
    chestPain: "Chest pain/dyspnea",
    feverGi: "Fever/GI",
    headTrauma: "Head trauma",
    selfHarm: "Self-harm thoughts",
    traumaDetail: "Trauma (detail)",
    identification: "Identification",
    name: "Name",
    ageDob: "Age/DOB",
    phone: "Phone",
    location: "Location",
    shelter: "Shelter/home",
    housing: "Housing damage",
    basicAccess: "Basic access",
    deathsMissing: "Deaths/missing",
    services: "Services",
    types: "Types",
    medico: "Physician",
    reason: "Reason",
    symptoms: "Symptoms",
    medications: "Medications",
    psicologo: "Psychologist",
    scale: "Scale 0-10",
    psicanalista: "Psychoanalyst",
    needs: "Basic needs",
    shelterSocial: "Shelter/social",
    separatedAlone: "Separated/alone",
    notes: "Notes",
    yes: "Yes",
    no: "No",
    unknown: "?",
  },
  es: {
    empty: "?",
    triage: "Triaje r?pido",
    priority: "Prioridad",
    flags: "Flags",
    walking: "Caminar",
    breathing: "Respiraci?n",
    consciousness: "Consciencia",
    bleeding: "Sangramiento",
    chestPain: "Dolor pecho/disnea",
    feverGi: "Fiebre/GI",
    headTrauma: "Trauma cabeza",
    selfHarm: "Autolesi?n",
    traumaDetail: "Trauma (detalle)",
    identification: "Identificaci?n",
    name: "Nombre",
    ageDob: "Edad/nac.",
    phone: "Tel?fono",
    location: "Ubicaci?n",
    shelter: "Refugio/casa",
    housing: "Vivienda",
    basicAccess: "Acceso b?sico",
    deathsMissing: "Fallecidos/desaparecidos",
    services: "Atenciones",
    types: "Tipos",
    medico: "M?dico",
    reason: "Motivo",
    symptoms: "S?ntomas",
    medications: "Medicamentos",
    psicologo: "Psic?logo",
    scale: "Escala 0-10",
    psicanalista: "Psicoanalista",
    needs: "Necesidades",
    shelterSocial: "Refugio/social",
    separatedAlone: "Separado/solo",
    notes: "Notas",
    yes: "S?",
    no: "No",
    unknown: "?",
  },
};

function normLang(lang: string | undefined): Lang {
  if (lang === "pt" || lang === "en" || lang === "es") return lang;
  return "es";
}

function yesNo(v: boolean | undefined | null, lang: Lang): string {
  const t = L[lang];
  if (v == null) return t.unknown;
  return v ? t.yes : t.no;
}

function str(v: unknown, lang: Lang): string {
  const empty = L[lang].unknown;
  if (v == null || v === "") return empty;
  if (typeof v === "boolean") return yesNo(v, lang);
  if (Array.isArray(v)) return v.length ? v.join(", ") : empty;
  return String(v);
}

function flagLabel(flag: string, lang: Lang): string {
  return TRIAGE_FLAG_LABELS[lang][flag] || flag;
}

export function hasVulnerabilityFlags(flags: string[]): boolean {
  return flags.some((f) => (VULNERABILITY_FLAGS as readonly string[]).includes(f));
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
  langInput = "es",
): {
  priority: string | null;
  status: string;
  anamneseComplete: boolean;
  sections: IntakeSummarySection[];
} {
  const lang = normLang(langInput);
  const t = L[lang];
  const sections: IntakeSummarySection[] = [];
  const triage = intake.triageData as HumanitarianTriageData | null;
  const id = intake.identificationData as IdentificationData | null;
  const specialty = intake.specialtyData as SpecialtyData | null;
  const needs = intake.basicNeedsData as BasicNeedsData | null;

  if (triage) {
    sections.push({
      title: t.triage,
      items: [
        { label: t.priority, value: intake.computedPriority || t.unknown },
        ...(intake.triageFlags.length
          ? [{
              label: t.flags,
              value: intake.triageFlags.map((f) => flagLabel(f, lang)).join(" ? "),
            }]
          : []),
        { label: t.walking, value: triage.walking },
        { label: t.breathing, value: triage.breathing },
        { label: t.consciousness, value: triage.consciousness },
        { label: t.bleeding, value: yesNo(triage.activeBleeding, lang) },
        { label: t.chestPain, value: yesNo(triage.chestPainOrSevereDyspnea, lang) },
        { label: t.feverGi, value: yesNo(triage.feverOrGi, lang) },
        { label: t.headTrauma, value: yesNo(triage.headTrauma, lang) },
        { label: t.selfHarm, value: yesNo(triage.selfHarmThoughts, lang) },
        ...(triage.headTraumaDescription
          ? [{ label: t.traumaDetail, value: triage.headTraumaDescription }]
          : []),
      ],
    });
  }

  if (id && Object.keys(id).some((k) => (id as Record<string, unknown>)[k])) {
    sections.push({
      title: t.identification,
      items: [
        { label: t.name, value: str(id.fullName, lang) },
        { label: t.ageDob, value: str(id.ageOrDob, lang) },
        { label: t.phone, value: str(id.phone, lang) },
        { label: t.location, value: [id.state, id.municipality].filter(Boolean).join(", ") || t.unknown },
        { label: t.shelter, value: str(id.shelterStatus, lang) },
        { label: t.housing, value: str(id.housingDamage, lang) },
        { label: t.basicAccess, value: str(id.accessWaterFoodMeds, lang) },
        { label: t.deathsMissing, value: yesNo(id.deathsOrMissing, lang) },
      ].filter((i) => i.value !== t.unknown),
    });
  }

  if (intake.serviceTypes.length > 0) {
    sections.push({
      title: t.services,
      items: [{ label: t.types, value: intake.serviceTypes.join(", ") }],
    });
  }

  if (specialty?.medico) {
    sections.push({
      title: t.medico,
      items: [
        { label: t.reason, value: str(specialty.medico.chiefReason, lang) },
        { label: t.symptoms, value: str(specialty.medico.physicalSymptoms, lang) },
        { label: t.medications, value: str(specialty.medico.medications, lang) },
      ].filter((i) => i.value !== t.unknown),
    });
  }

  if (specialty?.psicologo) {
    sections.push({
      title: t.psicologo,
      items: [
        { label: t.scale, value: str(specialty.psicologo.emotionalScale, lang) },
        { label: t.symptoms, value: str(specialty.psicologo.emotionalSymptoms, lang) },
      ].filter((i) => i.value !== t.unknown),
    });
  }

  if (specialty?.psicanalista?.reason) {
    sections.push({
      title: t.psicanalista,
      items: [{ label: t.reason, value: specialty.psicanalista.reason }],
    });
  }

  if (needs) {
    sections.push({
      title: t.needs,
      items: [
        { label: t.medications, value: yesNo(needs.needsMedicationHelp, lang) },
        { label: t.shelterSocial, value: yesNo(needs.needsShelterGuidance, lang) },
        { label: t.separatedAlone, value: yesNo(needs.separatedChildOrElderlyAlone, lang) },
      ],
    });
  }

  if (intake.additionalNotes) {
    sections.push({
      title: t.notes,
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
