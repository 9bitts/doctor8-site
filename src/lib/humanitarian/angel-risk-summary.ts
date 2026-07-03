import type { HumanitarianIntake } from "@prisma/client";
import type { Lang } from "@/lib/i18n/translations";

const FLAG_LABELS: Record<Lang, Record<string, string>> = {
  pt: {
    gestante_lactante: "Gestante/lactante",
    idade_65_mais: "65+ anos",
    deficiencia_mobilidade: "Deficiencia/mobilidade",
    crianca_menor_12: "Crianca <12",
    doenca_cronica: "Doenca cronica",
    sem_acesso_medicamentos: "Sem medicamentos",
    autolesao: "Autolesao",
    sangramento_ativo: "Sangramento ativo",
    dor_peito_dispneia: "Dor peito/dispneia",
    respiracao_muito_dificil: "Respiracao muito dificil",
    consciencia_sonolento: "Sonolento",
    trauma_cabeca: "Trauma cabeca",
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
    idade_65_mais: "65+ anos",
    deficiencia_mobilidade: "Discapacidad/movilidad",
    crianca_menor_12: "Nino <12",
    doenca_cronica: "Enfermedad cronica",
    sem_acesso_medicamentos: "Sin medicamentos",
    autolesao: "Autolesion",
    sangramento_ativo: "Sangrado activo",
    dor_peito_dispneia: "Dolor pecho/disnea",
    respiracao_muito_dificil: "Respiracion muy dificil",
    consciencia_sonolento: "Somnoliento",
    trauma_cabeca: "Trauma cabeza",
  },
};

function normLang(lang: string | undefined): Lang {
  if (lang === "pt" || lang === "en" || lang === "es") return lang;
  return "es";
}

function flagLabel(flag: string, lang: Lang): string {
  return FLAG_LABELS[lang][flag] || flag;
}

export type AngelRiskSummary = {
  priority: string | null;
  triageFlagLabels: string[];
};

export function buildAngelRiskSummary(
  intake: Pick<HumanitarianIntake, "computedPriority" | "triageFlags"> | null,
  langInput = "es",
  entryPriority?: string | null,
): AngelRiskSummary {
  const lang = normLang(langInput);
  const priority = intake?.computedPriority ?? entryPriority ?? null;
  const triageFlagLabels = (intake?.triageFlags ?? []).map((f) => flagLabel(f, lang));
  return { priority, triageFlagLabels };
}
