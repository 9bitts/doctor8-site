import type { ConsultTemplate } from "./types";

export const BREATHWORK_TEMPLATE: ConsultTemplate = {
  slug: "breathwork",
  emptyValues: () => ({
    currentState: "",
    breathingPattern: "",
    techniqueTaught: "",
    sessionDurationMins: "",
    homeFrequency: "",
    contraindications: "",
    integrationNotes: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "currentState", labelKey: "it.tpl.breath.currentState", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 3 },
    { key: "breathingPattern", labelKey: "it.tpl.breath.pattern", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "techniqueTaught", labelKey: "it.tpl.breath.technique", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "sessionDurationMins", labelKey: "it.tpl.breath.duration", type: "number", sectionKey: "it.tpl.section.intervention" },
    { key: "homeFrequency", labelKey: "it.tpl.breath.frequency", type: "text", sectionKey: "it.tpl.section.plan", placeholderKey: "it.tpl.breath.frequencyHint" },
    { key: "contraindications", labelKey: "it.tpl.breath.contraindications", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "integrationNotes", labelKey: "it.tpl.breath.integration", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
