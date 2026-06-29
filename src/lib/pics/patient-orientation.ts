import { translate, type Lang } from "@/lib/i18n/translations";
import type { IntegrativeVisitType } from "@/lib/integrative-consult-context";
import { getConsultTemplate, type StructuredValues } from "@/lib/pics/consult-templates";
import { picBySlug, picLabel } from "@/lib/pics/practices";

function line(label: string, value: string | undefined | null): string | null {
  const v = value?.trim();
  if (!v) return null;
  return `${label}: ${v}`;
}

function productLabel(values: StructuredValues, lang: Lang): string {
  const product = String(values.product ?? "");
  if (!product) return String(values.productOther ?? "").trim();
  if (product === "other") return String(values.productOther ?? "").trim();
  const tpl = getConsultTemplate("fitoterapia");
  const opt = tpl?.fields.find((f) => f.key === "product")?.options?.find((o) => o.value === product);
  return opt ? translate(lang, opt.labelKey) : product;
}

function presentationLabel(values: StructuredValues, lang: Lang): string {
  const pres = String(values.presentation ?? "").trim();
  if (!pres) return "";
  const tpl = getConsultTemplate("fitoterapia");
  const opt = tpl?.fields.find((f) => f.key === "presentation")?.options?.find((o) => o.value === pres);
  return opt ? translate(lang, opt.labelKey) : pres;
}

export function generatePatientHandout(opts: {
  practiceSlug: string;
  structured: StructuredValues;
  lang: Lang;
  clientName: string;
  visitType?: IntegrativeVisitType;
  freeTextNote?: string;
}): string {
  const { practiceSlug, structured, lang, clientName, visitType, freeTextNote } = opts;
  const t = (k: string) => translate(lang, k);
  const date = new Date().toLocaleDateString(
    lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US",
  );

  const lines: string[] = [
    t("it.handout.header"),
    "",
    `${t("it.handout.patient")}: ${clientName}`,
    `${t("it.handout.date")}: ${date}`,
  ];

  if (visitType) {
    lines.push(
      `${t("it.tpl.common.visitType")}: ${visitType === "first" ? t("it.consult.firstVisit") : t("it.consult.returnVisit")}`,
    );
  }

  if (practiceSlug) {
    const p = picBySlug(practiceSlug);
    const label = p ? picLabel(p, lang) : practiceSlug;
    lines.push(`${t("it.handout.practice")}: ${label}`);
  }

  lines.push("", "?".repeat(40), "");

  if (practiceSlug === "homeopatia") {
    const block = [
      line(t("it.tpl.homeo.remedy"), String(structured.remedy ?? "")),
      line(t("it.tpl.homeo.potency"), String(structured.potency ?? "")),
      line(t("it.tpl.homeo.posology"), String(structured.posology ?? "")),
      line(t("it.tpl.homeo.orientations"), String(structured.orientations ?? "")),
    ].filter(Boolean) as string[];
    lines.push(...block);
  } else if (practiceSlug === "acupuntura") {
    const techniques: string[] = [];
    if (structured.technique_needling) techniques.push(t("it.tpl.acu.techNeedling"));
    if (structured.technique_cupping) techniques.push(t("it.tpl.acu.techCupping"));
    if (structured.technique_moxa) techniques.push(t("it.tpl.acu.techMoxa"));
    if (structured.technique_electro) techniques.push(t("it.tpl.acu.techElectro"));
    if (structured.technique_laser) techniques.push(t("it.tpl.acu.techLaser"));

    const block = [
      structured.sessionNumber
        ? line(t("it.tpl.acu.sessionNum"), String(structured.sessionNumber))
        : null,
      structured.totalSessionsPlanned
        ? line(t("it.tpl.acu.totalSessions"), String(structured.totalSessionsPlanned))
        : null,
      techniques.length ? line(t("it.handout.techniques"), techniques.join(", ")) : null,
      line(t("it.tpl.acu.diet"), String(structured.dietaryOrientations ?? "")),
      line(t("it.tpl.common.prognosis"), String(structured.prognosis ?? "")),
    ].filter(Boolean) as string[];
    lines.push(...block);
  } else if (practiceSlug === "fitoterapia") {
    const block = [
      line(t("it.tpl.phyto.indication"), String(structured.indication ?? "")),
      line(t("it.tpl.phyto.product"), productLabel(structured, lang)),
      line(t("it.tpl.phyto.presentation"), presentationLabel(structured, lang)),
      line(t("it.tpl.phyto.preparation"), String(structured.preparation ?? "")),
      line(t("it.tpl.phyto.dose"), String(structured.dose ?? "")),
      line(t("it.tpl.phyto.duration"), String(structured.duration ?? "")),
      line(t("it.tpl.phyto.orientations"), String(structured.patientOrientations ?? "")),
    ].filter(Boolean) as string[];
    lines.push(...block);
  }

  const extra = String(structured.additionalNotes ?? freeTextNote ?? "").trim();
  if (extra) {
    lines.push("", `${t("it.tpl.common.additional")}:`, extra);
  }

  lines.push("", "?".repeat(40), "", t("it.handout.disclaimer"));

  return lines.join("\n").trim();
}

export function handoutHasContent(opts: {
  practiceSlug: string;
  structured: StructuredValues;
  freeTextNote?: string;
}): boolean {
  const { practiceSlug, structured, freeTextNote } = opts;
  if (freeTextNote?.trim()) return true;

  if (practiceSlug === "homeopatia") {
    return !!(structured.remedy || structured.posology || structured.orientations);
  }
  if (practiceSlug === "acupuntura") {
    return !!(structured.dietaryOrientations || structured.prognosis);
  }
  if (practiceSlug === "fitoterapia") {
    return !!(structured.product || structured.dose || structured.patientOrientations || structured.preparation);
  }
  return false;
}
