import { translate, type Lang } from "@/lib/i18n/translations";
import { HOMEOPATIA_TEMPLATE } from "./homeopatia";
import { ACUPUNTURA_TEMPLATE } from "./acupuntura";
import { FITOTERAPIA_TEMPLATE } from "./fitoterapia";
import { MEDITACAO_TEMPLATE } from "./meditacao";
import { YOGA_TEMPLATE } from "./yoga";
import { ARTETERAPIA_TEMPLATE } from "./arteterapia";
import { SHANTALA_TEMPLATE } from "./shantala";
import { REIKI_TEMPLATE } from "./reiki";
import { AROMATERAPIA_TEMPLATE } from "./aromaterapia";
import { BIODANCA_TEMPLATE } from "./biodanca";
import { REFLEXOTERAPIA_TEMPLATE } from "./reflexoterapia";
import { MUSICOTERAPIA_TEMPLATE } from "./musicoterapia";
import { TERAPIA_FLORAIS_TEMPLATE } from "./terapia_florais";
import { AYURVEDA_TEMPLATE } from "./ayurveda";
import { HIPNOTERAPIA_TEMPLATE } from "./hipnoterapia";
import { ANTROPOSOFIA_TEMPLATE } from "./antroposofia";
import { APITERAPIA_TEMPLATE } from "./apiterapia";
import { BIOENERGETICA_TEMPLATE } from "./bioenergetica";
import { CONSTELACAO_FAMILIAR_TEMPLATE } from "./constelacao_familiar";
import { CROMOTERAPIA_TEMPLATE } from "./cromoterapia";
import { DANCA_CIRCULAR_TEMPLATE } from "./danca_circular";
import { GEOTERAPIA_TEMPLATE } from "./geoterapia";
import { IMPOSICAO_MAOS_TEMPLATE } from "./imposicao_maos";
import { NATUROPATIA_TEMPLATE } from "./naturopatia";
import { OSTEOPATIA_TEMPLATE } from "./osteopatia";
import { OZONIOTERAPIA_TEMPLATE } from "./ozonioterapia";
import { QUIROPRAXIA_TEMPLATE } from "./quiropraxia";
import { TERAPIA_COMUNITARIA_TEMPLATE } from "./terapia_comunitaria";
import { TERMALISMO_TEMPLATE } from "./termalismo";
import type { ConsultTemplate, StructuredValues } from "./types";
export type { ConsultTemplate, StructuredField, StructuredValues } from "./types";

const TEMPLATES: Record<string, ConsultTemplate> = {
  homeopatia: HOMEOPATIA_TEMPLATE,
  acupuntura: ACUPUNTURA_TEMPLATE,
  fitoterapia: FITOTERAPIA_TEMPLATE,
  meditacao: MEDITACAO_TEMPLATE,
  yoga: YOGA_TEMPLATE,
  arteterapia: ARTETERAPIA_TEMPLATE,
  shantala: SHANTALA_TEMPLATE,
  reiki: REIKI_TEMPLATE,
  aromaterapia: AROMATERAPIA_TEMPLATE,
  biodanca: BIODANCA_TEMPLATE,
  reflexoterapia: REFLEXOTERAPIA_TEMPLATE,
  musicoterapia: MUSICOTERAPIA_TEMPLATE,
  terapia_florais: TERAPIA_FLORAIS_TEMPLATE,
  ayurveda: AYURVEDA_TEMPLATE,
  hipnoterapia: HIPNOTERAPIA_TEMPLATE,
  antroposofia: ANTROPOSOFIA_TEMPLATE,
  apiterapia: APITERAPIA_TEMPLATE,
  bioenergetica: BIOENERGETICA_TEMPLATE,
  constelacao_familiar: CONSTELACAO_FAMILIAR_TEMPLATE,
  cromoterapia: CROMOTERAPIA_TEMPLATE,
  danca_circular: DANCA_CIRCULAR_TEMPLATE,
  geoterapia: GEOTERAPIA_TEMPLATE,
  imposicao_maos: IMPOSICAO_MAOS_TEMPLATE,
  naturopatia: NATUROPATIA_TEMPLATE,
  osteopatia: OSTEOPATIA_TEMPLATE,
  ozonioterapia: OZONIOTERAPIA_TEMPLATE,
  quiropraxia: QUIROPRAXIA_TEMPLATE,
  terapia_comunitaria: TERAPIA_COMUNITARIA_TEMPLATE,
  termalismo: TERMALISMO_TEMPLATE,
};

export function hasStructuredTemplate(slug: string): boolean {
  return Boolean(TEMPLATES[slug]);
}

export function getConsultTemplate(slug: string): ConsultTemplate | undefined {
  return TEMPLATES[slug];
}

export function emptyStructuredValues(slug: string): StructuredValues {
  const tpl = getConsultTemplate(slug);
  return tpl ? { ...tpl.emptyValues() } : {};
}

function fieldDisplayValue(
  field: ConsultTemplate["fields"][number],
  value: string | boolean,
  lang: Lang,
): string | null {
  if (typeof value === "boolean") {
    return value ? translate(lang, field.labelKey) : null;
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (field.type === "select" && field.options) {
    const opt = field.options.find((o) => o.value === trimmed);
    if (opt) return translate(lang, opt.labelKey);
  }
  return trimmed;
}

export function renderStructuredNote(
  slug: string,
  values: StructuredValues,
  lang: Lang,
  opts?: { visitType?: "first" | "return" },
): string {
  const tpl = getConsultTemplate(slug);
  if (!tpl) return "";

  const lines: string[] = [];
  if (opts?.visitType) {
    const visitLabel =
      opts.visitType === "first"
        ? translate(lang, "it.consult.firstVisit")
        : translate(lang, "it.consult.returnVisit");
    lines.push(`${translate(lang, "it.tpl.common.visitType")}: ${visitLabel}`);
    lines.push("");
  }

  let currentSection = "";
  for (const field of tpl.fields) {
    const raw = values[field.key];
    if (raw === undefined) continue;

    const display = fieldDisplayValue(field, raw, lang);
    if (!display) continue;

    if (field.sectionKey && field.sectionKey !== currentSection) {
      currentSection = field.sectionKey;
      lines.push(`## ${translate(lang, field.sectionKey)}`);
    }

    if (field.type === "checkbox") {
      lines.push(`[x] ${display}`);
    } else {
      lines.push(`${translate(lang, field.labelKey)}: ${display}`);
    }
  }

  return lines.join("\n").trim();
}

export function structuredValuesHaveContent(values: StructuredValues): boolean {
  return Object.values(values).some((v) =>
    typeof v === "boolean" ? v : String(v).trim().length > 0,
  );
}

export function parseIntegrativeNoteContent(decrypted: string): {
  body: string;
  practiceSlug: string | null;
  format: "FREE" | "STRUCTURED";
  structured: StructuredValues | null;
  visitType: "first" | "return" | null;
} {
  try {
    const parsed = JSON.parse(decrypted);
    if (parsed?.integrativeNote) {
      return {
        body: parsed.body || parsed.renderedBody || "",
        practiceSlug: parsed.practiceSlug ?? null,
        format: parsed.format === "STRUCTURED" ? "STRUCTURED" : "FREE",
        structured: parsed.structured ?? null,
        visitType: parsed.visitType ?? null,
      };
    }
  } catch {
    /* plain text legacy */
  }
  return {
    body: decrypted,
    practiceSlug: null,
    format: "FREE",
    structured: null,
    visitType: null,
  };
}
