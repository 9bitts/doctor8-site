import { translate, type Lang } from "@/lib/i18n/translations";
import { HOMEOPATIA_TEMPLATE } from "./homeopatia";
import { ACUPUNTURA_TEMPLATE } from "./acupuntura";
import { FITOTERAPIA_TEMPLATE } from "./fitoterapia";
import type { ConsultTemplate, StructuredValues } from "./types";
export { hasStructuredTemplate } from "./types";
export type { ConsultTemplate, StructuredField, StructuredValues } from "./types";

const TEMPLATES: Record<string, ConsultTemplate> = {
  homeopatia: HOMEOPATIA_TEMPLATE,
  acupuntura: ACUPUNTURA_TEMPLATE,
  fitoterapia: FITOTERAPIA_TEMPLATE,
};

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
