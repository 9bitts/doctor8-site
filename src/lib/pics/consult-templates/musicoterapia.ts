import type { ConsultTemplate } from "./types";

export const MUSICOTERAPIA_TEMPLATE: ConsultTemplate = {
  slug: "musicoterapia",
  emptyValues: () => ({
    emotionalState: "",
    therapeuticGoals: "",
    instrumentsUsed: "",
    repertoire: "",
    patientResponse: "",
    homeListening: "",
    frequency: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "emotionalState", labelKey: "it.tpl.music.emotional", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "therapeuticGoals", labelKey: "it.tpl.music.goals", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "instrumentsUsed", labelKey: "it.tpl.music.instruments", type: "text", sectionKey: "it.tpl.section.intervention" },
    { key: "repertoire", labelKey: "it.tpl.music.repertoire", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "patientResponse", labelKey: "it.tpl.music.response", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "homeListening", labelKey: "it.tpl.music.homeListening", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "frequency", labelKey: "it.tpl.music.frequency", type: "text", sectionKey: "it.tpl.section.plan" },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
