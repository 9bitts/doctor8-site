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

const DOT = "\u00b7";
const DASH = "\u2014";

const TRIAGE_FLAG_LABELS: Record<Lang, Record<string, string>> = {
  pt: {
    gestante_lactante: "Gestante/lactante",
    idade_65_mais: "65+ anos",
    deficiencia_mobilidade: "Defici\u00eancia/mobilidade",
    crianca_menor_12: "Crian\u00e7a <12",
    doenca_cronica: "Doen\u00e7a cr\u00f4nica",
    sem_acesso_medicamentos: "Sem medicamentos",
    autolesao: "Autoles\u00e3o",
    sangramento_ativo: "Sangramento ativo",
    dor_peito_dispneia: "Dor peito/dispneia",
    respiracao_muito_dificil: "Respira\u00e7\u00e3o muito dif\u00edcil",
    consciencia_sonolento: "Sonolento",
    trauma_cabeca: "Trauma cabe\u00e7a",
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
    idade_65_mais: "65+ a\u00f1os",
    deficiencia_mobilidade: "Discapacidad/movilidad",
    crianca_menor_12: "Ni\u00f1o <12",
    doenca_cronica: "Enfermedad cr\u00f3nica",
    sem_acesso_medicamentos: "Sin medicamentos",
    autolesao: "Autolesi\u00f3n",
    sangramento_ativo: "Sangrado activo",
    dor_peito_dispneia: "Dolor pecho/disnea",
    respiracao_muito_dificil: "Respiraci\u00f3n muy dif\u00edcil",
    consciencia_sonolento: "Somnoliento",
    trauma_cabeca: "Trauma cabeza",
  },
};

const SERVICE_TYPE_LABELS: Record<Lang, Record<string, string>> = {
  pt: {
    medico: "M\u00e9dico",
    psicologo: "Psic\u00f3logo",
    psicanalista: "Psicanalista",
    fisioterapeuta: "Fisioterapeuta",
    nutricionista: "Nutricionista",
    terapeuta_integrativo: "Terapeuta integrativo",
    cuidados_paliativos: "Cuidados paliativos",
    nao_sei: "N\u00e3o sei",
  },
  en: {
    medico: "Physician",
    psicologo: "Psychologist",
    psicanalista: "Psychoanalyst",
    fisioterapeuta: "Physiotherapist",
    nutricionista: "Nutritionist",
    terapeuta_integrativo: "Integrative therapist",
    cuidados_paliativos: "Palliative care",
    nao_sei: "Not sure",
  },
  es: {
    medico: "M\u00e9dico",
    psicologo: "Psic\u00f3logo",
    psicanalista: "Psicoanalista",
    fisioterapeuta: "Fisioterapeuta",
    nutricionista: "Nutricionista",
    terapeuta_integrativo: "Terapeuta integrativo",
    cuidados_paliativos: "Cuidados paliativos",
    nao_sei: "No s\u00e9",
  },
};

type Labels = {
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
  chronicConditions: string;
  allergies: string;
  psicologo: string;
  scale: string;
  psicanalista: string;
  safeSpace: string;
  fisioterapeuta: string;
  painLocation: string;
  painAfterEarthquake: string;
  canMoveLimbs: string;
  swellingNumbness: string;
  nutricionista: string;
  mealsPerDay: string;
  variedFoodAccess: string;
  dietaryRestrictions: string;
  weightChange: string;
  familyNutritionOk: string;
  terapeutaIntegrativo: string;
  usedBefore: string;
  seeksReliefFor: string;
  preferences: string;
  cuidadosPaliativos: string;
  diagnosis: string;
  mainSymptoms: string;
  curativeTreatment: string;
  hasCaregiver: string;
  needs: string;
  shelterSocial: string;
  separatedAlone: string;
  notes: string;
  yes: string;
  no: string;
};

const L: Record<Lang, Labels> = {
  pt: {
    empty: DASH,
    triage: "Triagem r\u00e1pida",
    priority: "Prioridade",
    flags: "Flags",
    walking: "Caminhar",
    breathing: "Respira\u00e7\u00e3o",
    consciousness: "Consci\u00eancia",
    bleeding: "Sangramento",
    chestPain: "Dor peito/dispneia",
    feverGi: "Febre/GI",
    headTrauma: "Trauma cabe\u00e7a",
    selfHarm: "Autoles\u00e3o",
    traumaDetail: "Trauma (detalhe)",
    identification: "Identifica\u00e7\u00e3o",
    name: "Nome",
    ageDob: "Idade/nasc.",
    phone: "Telefone",
    location: "Localiza\u00e7\u00e3o",
    shelter: "Abrigo/casa",
    housing: "Moradia",
    basicAccess: "Acesso b\u00e1sico",
    deathsMissing: "Mortos/desaparecidos",
    services: "Atendimentos",
    types: "Tipos",
    medico: "M\u00e9dico",
    reason: "Motivo",
    symptoms: "Sintomas",
    medications: "Medicamentos",
    chronicConditions: "Condi\u00e7\u00f5es cr\u00f4nicas",
    allergies: "Alergias",
    psicologo: "Psic\u00f3logo",
    scale: "Escala 0-10",
    psicanalista: "Psicanalista",
    safeSpace: "Espa\u00e7o seguro",
    fisioterapeuta: "Fisioterapeuta",
    painLocation: "Local da dor",
    painAfterEarthquake: "Dor ap\u00f3s terremoto",
    canMoveLimbs: "Move membros",
    swellingNumbness: "Incha\u00e7o/formigamento",
    nutricionista: "Nutricionista",
    mealsPerDay: "Refei\u00e7\u00f5es/dia",
    variedFoodAccess: "Alimenta\u00e7\u00e3o variada",
    dietaryRestrictions: "Restri\u00e7\u00f5es",
    weightChange: "Mudan\u00e7a de peso",
    familyNutritionOk: "Fam\u00edlia alimentada",
    terapeutaIntegrativo: "Terapeuta integrativo",
    usedBefore: "J\u00e1 usou antes",
    seeksReliefFor: "Busca al\u00edvio para",
    preferences: "Prefer\u00eancias",
    cuidadosPaliativos: "Cuidados paliativos",
    diagnosis: "Diagn\u00f3stico",
    mainSymptoms: "Sintomas principais",
    curativeTreatment: "Tratamento curativo",
    hasCaregiver: "Tem cuidador",
    needs: "Necessidades",
    shelterSocial: "Abrigo/social",
    separatedAlone: "Separado/sozinho",
    notes: "Notas",
    yes: "Sim",
    no: "N\u00e3o",
  },
  en: {
    empty: DASH,
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
    chronicConditions: "Chronic conditions",
    allergies: "Allergies",
    psicologo: "Psychologist",
    scale: "Scale 0-10",
    psicanalista: "Psychoanalyst",
    safeSpace: "Safe space",
    fisioterapeuta: "Physiotherapist",
    painLocation: "Pain location",
    painAfterEarthquake: "Pain after earthquake",
    canMoveLimbs: "Can move limbs",
    swellingNumbness: "Swelling/numbness",
    nutricionista: "Nutritionist",
    mealsPerDay: "Meals/day",
    variedFoodAccess: "Varied food access",
    dietaryRestrictions: "Dietary restrictions",
    weightChange: "Weight change",
    familyNutritionOk: "Family nutrition OK",
    terapeutaIntegrativo: "Integrative therapist",
    usedBefore: "Used before",
    seeksReliefFor: "Seeks relief for",
    preferences: "Preferences",
    cuidadosPaliativos: "Palliative care",
    diagnosis: "Diagnosis",
    mainSymptoms: "Main symptoms",
    curativeTreatment: "Curative treatment",
    hasCaregiver: "Has caregiver",
    needs: "Basic needs",
    shelterSocial: "Shelter/social",
    separatedAlone: "Separated/alone",
    notes: "Notes",
    yes: "Yes",
    no: "No",
  },
  es: {
    empty: DASH,
    triage: "Triaje r\u00e1pido",
    priority: "Prioridad",
    flags: "Flags",
    walking: "Caminar",
    breathing: "Respiraci\u00f3n",
    consciousness: "Consciencia",
    bleeding: "Sangramiento",
    chestPain: "Dolor pecho/disnea",
    feverGi: "Fiebre/GI",
    headTrauma: "Trauma cabeza",
    selfHarm: "Autolesi\u00f3n",
    traumaDetail: "Trauma (detalle)",
    identification: "Identificaci\u00f3n",
    name: "Nombre",
    ageDob: "Edad/nac.",
    phone: "Tel\u00e9fono",
    location: "Ubicaci\u00f3n",
    shelter: "Refugio/casa",
    housing: "Vivienda",
    basicAccess: "Acceso b\u00e1sico",
    deathsMissing: "Fallecidos/desaparecidos",
    services: "Atenciones",
    types: "Tipos",
    medico: "M\u00e9dico",
    reason: "Motivo",
    symptoms: "S\u00edntomas",
    medications: "Medicamentos",
    chronicConditions: "Condiciones cr\u00f3nicas",
    allergies: "Alergias",
    psicologo: "Psic\u00f3logo",
    scale: "Escala 0-10",
    psicanalista: "Psicoanalista",
    safeSpace: "Espacio seguro",
    fisioterapeuta: "Fisioterapeuta",
    painLocation: "Ubicaci\u00f3n del dolor",
    painAfterEarthquake: "Dolor tras terremoto",
    canMoveLimbs: "Mueve extremidades",
    swellingNumbness: "Hinchaz\u00f3n/hormigueo",
    nutricionista: "Nutricionista",
    mealsPerDay: "Comidas/d\u00eda",
    variedFoodAccess: "Alimentaci\u00f3n variada",
    dietaryRestrictions: "Restricciones",
    weightChange: "Cambio de peso",
    familyNutritionOk: "Familia alimentada",
    terapeutaIntegrativo: "Terapeuta integrativo",
    usedBefore: "Us\u00f3 antes",
    seeksReliefFor: "Busca alivio para",
    preferences: "Preferencias",
    cuidadosPaliativos: "Cuidados paliativos",
    diagnosis: "Diagn\u00f3stico",
    mainSymptoms: "S\u00edntomas principales",
    curativeTreatment: "Tratamiento curativo",
    hasCaregiver: "Tiene cuidador",
    needs: "Necesidades",
    shelterSocial: "Refugio/social",
    separatedAlone: "Separado/solo",
    notes: "Notas",
    yes: "S\u00ed",
    no: "No",
  },
};

function normLang(lang: string | undefined): Lang {
  if (lang === "pt" || lang === "en" || lang === "es") return lang;
  return "es";
}

function yesNo(v: boolean | undefined | null, lang: Lang): string {
  const t = L[lang];
  if (v == null) return t.empty;
  return v ? t.yes : t.no;
}

function str(v: unknown, lang: Lang): string {
  const empty = L[lang].empty;
  if (v == null || v === "") return empty;
  if (typeof v === "boolean") return yesNo(v, lang);
  if (Array.isArray(v)) return v.length ? v.join(", ") : empty;
  return String(v);
}

function flagLabel(flag: string, lang: Lang): string {
  return TRIAGE_FLAG_LABELS[lang][flag] || flag;
}

function serviceTypeLabel(slug: string, lang: Lang): string {
  return SERVICE_TYPE_LABELS[lang][slug] || slug;
}

function filterItems(items: { label: string; value: string }[], lang: Lang) {
  const empty = L[lang].empty;
  return items.filter((i) => i.value !== empty);
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
        { label: t.priority, value: intake.computedPriority || t.empty },
        ...(intake.triageFlags.length
          ? [{
              label: t.flags,
              value: intake.triageFlags.map((f) => flagLabel(f, lang)).join(` ${DOT} `),
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
      items: filterItems([
        { label: t.name, value: str(id.fullName, lang) },
        { label: t.ageDob, value: str(id.ageOrDob, lang) },
        { label: t.phone, value: str(id.phone, lang) },
        { label: t.location, value: [id.state, id.municipality].filter(Boolean).join(", ") || t.empty },
        { label: t.shelter, value: str(id.shelterStatus, lang) },
        { label: t.housing, value: str(id.housingDamage, lang) },
        { label: t.basicAccess, value: str(id.accessWaterFoodMeds, lang) },
        { label: t.deathsMissing, value: yesNo(id.deathsOrMissing, lang) },
      ], lang),
    });
  }

  if (intake.serviceTypes.length > 0) {
    sections.push({
      title: t.services,
      items: [{
        label: t.types,
        value: intake.serviceTypes.map((s) => serviceTypeLabel(s, lang)).join(", "),
      }],
    });
  }

  if (specialty?.medico) {
    sections.push({
      title: t.medico,
      items: filterItems([
        { label: t.reason, value: str(specialty.medico.chiefReason, lang) },
        { label: t.symptoms, value: str(specialty.medico.physicalSymptoms, lang) },
        { label: t.chronicConditions, value: str(specialty.medico.chronicConditions, lang) },
        { label: t.medications, value: str(specialty.medico.medications, lang) },
        { label: t.allergies, value: str(specialty.medico.allergies, lang) },
      ], lang),
    });
  }

  if (specialty?.psicologo) {
    sections.push({
      title: t.psicologo,
      items: filterItems([
        { label: t.scale, value: str(specialty.psicologo.emotionalScale, lang) },
        { label: t.symptoms, value: str(specialty.psicologo.emotionalSymptoms, lang) },
      ], lang),
    });
  }

  if (specialty?.psicanalista) {
    sections.push({
      title: t.psicanalista,
      items: filterItems([
        { label: t.reason, value: str(specialty.psicanalista.reason, lang) },
        { label: t.safeSpace, value: str(specialty.psicanalista.safeSpace, lang) },
      ], lang),
    });
  }

  if (specialty?.fisioterapeuta) {
    sections.push({
      title: t.fisioterapeuta,
      items: filterItems([
        { label: t.painLocation, value: str(specialty.fisioterapeuta.painLocation, lang) },
        { label: t.painAfterEarthquake, value: yesNo(specialty.fisioterapeuta.painAfterEarthquake, lang) },
        { label: t.canMoveLimbs, value: yesNo(specialty.fisioterapeuta.canMoveLimbs, lang) },
        { label: t.swellingNumbness, value: str(specialty.fisioterapeuta.swellingOrNumbness, lang) },
      ], lang),
    });
  }

  if (specialty?.nutricionista) {
    sections.push({
      title: t.nutricionista,
      items: filterItems([
        { label: t.mealsPerDay, value: str(specialty.nutricionista.mealsPerDay, lang) },
        { label: t.variedFoodAccess, value: yesNo(specialty.nutricionista.variedFoodAccess, lang) },
        { label: t.dietaryRestrictions, value: str(specialty.nutricionista.dietaryRestrictions, lang) },
        { label: t.weightChange, value: str(specialty.nutricionista.weightChange, lang) },
        { label: t.familyNutritionOk, value: yesNo(specialty.nutricionista.familyNutritionOk, lang) },
      ], lang),
    });
  }

  if (specialty?.terapeuta_integrativo) {
    sections.push({
      title: t.terapeutaIntegrativo,
      items: filterItems([
        { label: t.usedBefore, value: yesNo(specialty.terapeuta_integrativo.usedBefore, lang) },
        { label: t.seeksReliefFor, value: str(specialty.terapeuta_integrativo.seeksReliefFor, lang) },
        { label: t.preferences, value: str(specialty.terapeuta_integrativo.preferences, lang) },
      ], lang),
    });
  }

  if (specialty?.cuidados_paliativos) {
    sections.push({
      title: t.cuidadosPaliativos,
      items: filterItems([
        { label: t.diagnosis, value: str(specialty.cuidados_paliativos.diagnosis, lang) },
        { label: t.mainSymptoms, value: str(specialty.cuidados_paliativos.mainSymptoms, lang) },
        { label: t.curativeTreatment, value: yesNo(specialty.cuidados_paliativos.curativeTreatment, lang) },
        { label: t.hasCaregiver, value: yesNo(specialty.cuidados_paliativos.hasCaregiver, lang) },
      ], lang),
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
