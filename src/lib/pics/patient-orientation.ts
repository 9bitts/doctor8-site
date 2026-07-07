import { translate, type Lang } from "@/lib/i18n/translations";
import type { IntegrativeVisitType } from "@/lib/integrative-consult-context";
import { getConsultTemplate, type StructuredValues } from "@/lib/pics/consult-templates";
import { HANDOUT_FIELD_MAP, handoutFieldsHaveContent } from "@/lib/pics/handout-fields";
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

  lines.push("", "---", "");

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
  } else if (practiceSlug === "meditacao") {
    const block = [
      line(t("it.tpl.medit.technique"), String(structured.techniqueTaught ?? "")),
      line(t("it.tpl.medit.frequency"), String(structured.homeFrequency ?? "")),
      line(t("it.tpl.medit.posture"), String(structured.postureTips ?? "")),
      line(t("it.tpl.medit.timeOfDay"), String(structured.bestTimeOfDay ?? "")),
    ].filter(Boolean) as string[];
    lines.push(...block);
  } else if (practiceSlug === "yoga") {
    const block = [
      line(t("it.tpl.yoga.practices"), String(structured.practicesTaught ?? "")),
      line(t("it.tpl.yoga.frequency"), String(structured.homeFrequency ?? "")),
      line(t("it.tpl.yoga.cautions"), String(structured.cautions ?? "")),
    ].filter(Boolean) as string[];
    lines.push(...block);
  } else if (practiceSlug === "arteterapia") {
    const block = [
      line(t("it.tpl.art.homeExercise"), String(structured.homeExercise ?? "")),
      line(t("it.tpl.art.frequency"), String(structured.frequency ?? "")),
    ].filter(Boolean) as string[];
    lines.push(...block);
  } else if (practiceSlug === "shantala") {
    const block = [
      line(t("it.tpl.shantala.technique"), String(structured.techniqueTaught ?? "")),
      line(t("it.tpl.shantala.frequency"), String(structured.homeFrequency ?? "")),
      line(t("it.tpl.shantala.cautions"), String(structured.cautions ?? "")),
    ].filter(Boolean) as string[];
    lines.push(...block);
  } else if (practiceSlug === "reiki") {
    lines.push(
      ...([
        line(t("it.tpl.reiki.selfCare"), String(structured.selfCareTips ?? "")),
        line(t("it.tpl.reiki.frequency"), String(structured.homeFrequency ?? "")),
      ].filter(Boolean) as string[]),
    );
  } else if (practiceSlug === "aromaterapia") {
    lines.push(
      ...([
        line(t("it.tpl.aroma.oils"), String(structured.oilsSelected ?? "")),
        line(t("it.tpl.aroma.homeUse"), String(structured.homeUse ?? "")),
        line(t("it.tpl.aroma.cautions"), String(structured.cautions ?? "")),
      ].filter(Boolean) as string[]),
    );
  } else if (practiceSlug === "biodanca") {
    lines.push(
      ...([
        line(t("it.tpl.biodanca.exercises"), String(structured.exercisesTaught ?? "")),
        line(t("it.tpl.biodanca.frequency"), String(structured.homeFrequency ?? "")),
      ].filter(Boolean) as string[]),
    );
  } else if (practiceSlug === "reflexoterapia") {
    lines.push(
      ...([
        line(t("it.tpl.reflex.selfMassage"), String(structured.selfMassagePoints ?? "")),
        line(t("it.tpl.reflex.frequency"), String(structured.homeFrequency ?? "")),
      ].filter(Boolean) as string[]),
    );
  } else if (practiceSlug === "musicoterapia") {
    lines.push(
      ...([
        line(t("it.tpl.music.homeListening"), String(structured.homeListening ?? "")),
        line(t("it.tpl.music.frequency"), String(structured.frequency ?? "")),
      ].filter(Boolean) as string[]),
    );
  } else if (practiceSlug === "terapia_florais") {
    lines.push(
      ...([
        line(t("it.tpl.florais.formula"), String(structured.essencesFormula ?? "")),
        line(t("it.tpl.florais.product"), String(structured.floralProduct ?? "")),
        line(t("it.tpl.florais.posology"), String(structured.posology ?? "")),
        line(t("it.tpl.florais.orientations"), String(structured.orientations ?? "")),
      ].filter(Boolean) as string[]),
    );
  } else if (practiceSlug === "ayurveda") {
    lines.push(
      ...([
        line(t("it.tpl.ayur.diet"), String(structured.dietRecommendations ?? "")),
        line(t("it.tpl.ayur.routine"), String(structured.routineRecommendations ?? "")),
        line(t("it.tpl.ayur.lifestyle"), String(structured.lifestyleTips ?? "")),
      ].filter(Boolean) as string[]),
    );
  } else if (practiceSlug === "hipnoterapia") {
    lines.push(
      ...([
        line(t("it.tpl.hypno.reinforcement"), String(structured.reinforcementPlan ?? "")),
        line(t("it.tpl.hypno.homePractice"), String(structured.homePractice ?? "")),
      ].filter(Boolean) as string[]),
    );
  } else if (HANDOUT_FIELD_MAP[practiceSlug]) {
    const block = HANDOUT_FIELD_MAP[practiceSlug]
      .map((f) => line(t(f.labelKey), String(structured[f.fieldKey] ?? "")))
      .filter(Boolean) as string[];
    lines.push(...block);
  }

  const extra = String(structured.additionalNotes ?? freeTextNote ?? "").trim();
  if (extra) {
    lines.push("", `${t("it.tpl.common.additional")}:`, extra);
  }

  lines.push("", "---", "", t("it.handout.disclaimer"));

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
  if (practiceSlug === "meditacao") {
    return !!(structured.techniqueTaught || structured.homeFrequency || structured.postureTips);
  }
  if (practiceSlug === "yoga") {
    return !!(structured.practicesTaught || structured.homeFrequency);
  }
  if (practiceSlug === "arteterapia") {
    return !!(structured.homeExercise || structured.frequency);
  }
  if (practiceSlug === "shantala") {
    return !!(structured.techniqueTaught || structured.homeFrequency);
  }
  if (practiceSlug === "reiki") {
    return !!(structured.selfCareTips || structured.homeFrequency);
  }
  if (practiceSlug === "aromaterapia") {
    return !!(structured.oilsSelected || structured.homeUse);
  }
  if (practiceSlug === "biodanca") {
    return !!(structured.exercisesTaught || structured.homeFrequency);
  }
  if (practiceSlug === "reflexoterapia") {
    return !!(structured.selfMassagePoints || structured.homeFrequency);
  }
  if (practiceSlug === "musicoterapia") {
    return !!(structured.homeListening || structured.frequency);
  }
  if (practiceSlug === "terapia_florais") {
    return !!(structured.essencesFormula || structured.posology);
  }
  if (practiceSlug === "ayurveda") {
    return !!(structured.dietRecommendations || structured.routineRecommendations || structured.lifestyleTips);
  }
  if (practiceSlug === "hipnoterapia") {
    return !!(structured.reinforcementPlan || structured.homePractice);
  }
  return handoutFieldsHaveContent(practiceSlug, structured);
}
