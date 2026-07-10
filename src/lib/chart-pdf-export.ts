// Build complete patient chart sections for PDF export.

import type { Lang } from "@/lib/i18n/translations";
import { translate } from "@/lib/i18n/translations";
import { getCategoryGroupLabel, getCategoryLabel } from "@/lib/category-i18n";
import {
  countRecordAttachments,
  formatRecordContentForDisplay,
} from "@/lib/record-content";
import { parsePsychologyContent } from "@/lib/psychology-api";
import type { ChartExportSection } from "@/lib/psychology-chart-pdf";

export interface MedicationExportItem {
  name: string;
  dosage?: string;
  frequency?: string;
}

export interface ChartDocForExport {
  type: string;
  recordKind?: string | null;
  title: string;
  content: string | null;
  createdAt: Date;
  hasFile: boolean;
  categoryName?: string | null;
  categoryGroup?: string | null;
  sourceDocumentId?: string | null;
  medications?: MedicationExportItem[] | null;
}

export interface PatientChartForExport {
  dateOfBirth?: string | null;
  cpf?: string | null;
  sex?: string | null;
  phone?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zipCode?: string | null;
  notes?: string | null;
  profileAllergies?: string | null;
}

const DOC_TYPE_KEYS: Record<string, string> = {
  PRESCRIPTION: "doctype.PRESCRIPTION",
  EXAM_REQUEST: "doctype.EXAM_REQUEST",
  EXAM_RESULT: "doctype.EXAM_RESULT",
  CERTIFICATE: "doctype.CERTIFICATE",
  REFERRAL: "doctype.REFERRAL",
  CLINICAL_NOTE: "doctype.CLINICAL_NOTE",
  OTHER: "doctype.OTHER",
};

function localeOf(lang: Lang): string {
  return lang === "pt" ? "pt-BR" : lang === "es" ? "es" : "en-US";
}

function formatSex(lang: Lang, sex: string): string {
  if (sex === "M") return translate(lang, "pat.sexM");
  if (sex === "F") return translate(lang, "pat.sexF");
  if (sex === "O") return translate(lang, "pat.sexO");
  return sex;
}

function formatMedicationsForExport(medications: MedicationExportItem[]): string {
  return medications
    .map((m, i) => {
      let line = `${i + 1}. ${m.name}`;
      if (m.dosage) line += ` — ${m.dosage}`;
      if (m.frequency) line += `, ${m.frequency}`;
      return line;
    })
    .join("\n");
}

function resolveCategoryLabel(lang: Lang, doc: ChartDocForExport): string {
  if (doc.categoryName) {
    return getCategoryLabel(lang, { name: doc.categoryName });
  }
  const key = DOC_TYPE_KEYS[doc.type] || DOC_TYPE_KEYS.OTHER;
  return translate(lang, key);
}

function buildSectionMeta(lang: Lang, doc: ChartDocForExport, attachmentCount: number): string {
  const parts: string[] = [];
  parts.push(resolveCategoryLabel(lang, doc));

  if (doc.categoryGroup) {
    const group = getCategoryGroupLabel(lang, doc.categoryGroup);
    if (group) parts.push(group);
  }

  if (doc.recordKind && doc.type !== "PRESCRIPTION") {
    const kindKey = `kind.${doc.recordKind.toLowerCase()}`;
    const kindLabel = translate(lang, kindKey);
    if (kindLabel !== kindKey) parts.push(kindLabel);
  }

  if (doc.sourceDocumentId) {
    parts.push(translate(lang, "rec.sharedReadOnly"));
  }

  if (attachmentCount > 0) {
    parts.push(`${attachmentCount} ${translate(lang, "rec.attachments")}`);
  }

  return parts.join(" · ");
}

export function formatDocumentBodyForExport(
  lang: Lang,
  doc: ChartDocForExport,
): string {
  if (doc.type === "PRESCRIPTION" && doc.medications?.length) {
    return formatMedicationsForExport(doc.medications);
  }

  const raw = doc.content || "";
  if (!raw) {
    if (doc.type === "PRESCRIPTION") {
      return {
        pt: "Prescrição / Receita",
        en: "Prescription",
        es: "Prescripción / Receta",
      }[lang];
    }
    return "—";
  }

  const parsed = parsePsychologyContent(raw);
  if (parsed && typeof parsed.renderedBody === "string" && parsed.renderedBody.trim()) {
    return parsed.renderedBody;
  }

  return formatRecordContentForDisplay(raw);
}

export function buildChartExportSections(
  lang: Lang,
  docs: ChartDocForExport[],
): ChartExportSection[] {
  return docs.map((doc) => {
    const attachmentCount = countRecordAttachments(doc.hasFile, doc.content);
    return {
      title: doc.title,
      meta: buildSectionMeta(lang, doc, attachmentCount),
      body: formatDocumentBodyForExport(lang, doc),
      date: doc.createdAt.toLocaleString(localeOf(lang), {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  });
}

export function buildPatientInfoLines(
  lang: Lang,
  info: PatientChartForExport,
): string[] {
  const lines: string[] = [];
  const add = (labelKey: string, value: string | null | undefined) => {
    if (value?.trim()) lines.push(`${translate(lang, labelKey)}: ${value.trim()}`);
  };

  add("pat.dob", info.dateOfBirth);
  add("pat.cpf", info.cpf);
  if (info.sex) add("pat.sex", formatSex(lang, info.sex));
  add("pat.phone", info.phone);
  if (info.email?.trim()) lines.push(`E-mail: ${info.email.trim()}`);

  const addressParts = [
    info.addressLine1,
    [info.city, info.state].filter(Boolean).join(" - "),
    info.zipCode,
    info.country && info.country !== "BR" ? info.country : null,
  ].filter(Boolean);
  if (addressParts.length) {
    add("pat.address", addressParts.join(", "));
  }

  if (info.profileAllergies?.trim()) {
    lines.push(`${translate(lang, "hist.allergies")}: ${info.profileAllergies.trim()}`);
  }

  if (info.notes?.trim()) {
    lines.push(`${translate(lang, "rec.notes")}: ${info.notes.trim()}`);
  }

  return lines;
}

export function formatDiagnosesForExport(
  lang: Lang,
  diagnoses: { cidCode: string; cidLabel: string | null; status: string; notedAt: Date }[],
): string[] {
  return diagnoses.map((d) => {
    const label = d.cidLabel ? ` — ${d.cidLabel}` : "";
    const date = d.notedAt.toLocaleDateString(localeOf(lang));
    const statusSuffix = d.status !== "ACTIVE" ? ` (${d.status})` : "";
    return `${d.cidCode}${label}${statusSuffix} · ${date}`;
  });
}
