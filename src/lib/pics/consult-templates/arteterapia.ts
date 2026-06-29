import type { ConsultTemplate } from "./types";

export const ARTETERAPIA_TEMPLATE: ConsultTemplate = {
  slug: "arteterapia",
  emptyValues: () => ({
    emotionalTheme: "",
    expressiveLanguage: "",
    materialsUsed: "",
    sessionEvolution: "",
    homeExercise: "",
    frequency: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "emotionalTheme", labelKey: "it.tpl.art.emotionalTheme", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 3 },
    { key: "expressiveLanguage", labelKey: "it.tpl.art.language", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2, placeholderKey: "it.tpl.art.languageHint" },
    { key: "materialsUsed", labelKey: "it.tpl.art.materials", type: "text", sectionKey: "it.tpl.section.intervention" },
    { key: "sessionEvolution", labelKey: "it.tpl.art.evolution", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "homeExercise", labelKey: "it.tpl.art.homeExercise", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "frequency", labelKey: "it.tpl.art.frequency", type: "text", sectionKey: "it.tpl.section.plan" },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
