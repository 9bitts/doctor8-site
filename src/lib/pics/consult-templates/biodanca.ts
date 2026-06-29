import type { ConsultTemplate } from "./types";

export const BIODANCA_TEMPLATE: ConsultTemplate = {
  slug: "biodanca",
  emptyValues: () => ({
    bodyExpression: "",
    emotionalTheme: "",
    exercisesTaught: "",
    musicUsed: "",
    homeFrequency: "",
    cautions: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "bodyExpression", labelKey: "it.tpl.biodanca.expression", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "emotionalTheme", labelKey: "it.tpl.biodanca.theme", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "exercisesTaught", labelKey: "it.tpl.biodanca.exercises", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 3 },
    { key: "musicUsed", labelKey: "it.tpl.biodanca.music", type: "text", sectionKey: "it.tpl.section.intervention" },
    { key: "homeFrequency", labelKey: "it.tpl.biodanca.frequency", type: "text", sectionKey: "it.tpl.section.plan", placeholderKey: "it.tpl.medit.frequencyHint" },
    { key: "cautions", labelKey: "it.tpl.biodanca.cautions", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
