import type { ConsultTemplate } from "./types";

export const HIPNOTERAPIA_TEMPLATE: ConsultTemplate = {
  slug: "hipnoterapia",
  emptyValues: () => ({
    therapeuticGoals: "",
    suggestibilityNotes: "",
    inductionTechnique: "",
    suggestionsGiven: "",
    patientResponse: "",
    reinforcementPlan: "",
    homePractice: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "therapeuticGoals", labelKey: "it.tpl.hypno.goals", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "suggestibilityNotes", labelKey: "it.tpl.hypno.suggestibility", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "inductionTechnique", labelKey: "it.tpl.hypno.induction", type: "text", sectionKey: "it.tpl.section.intervention" },
    { key: "suggestionsGiven", labelKey: "it.tpl.hypno.suggestions", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 3 },
    { key: "patientResponse", labelKey: "it.tpl.hypno.response", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "reinforcementPlan", labelKey: "it.tpl.hypno.reinforcement", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "homePractice", labelKey: "it.tpl.hypno.homePractice", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
