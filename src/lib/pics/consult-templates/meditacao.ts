import type { ConsultTemplate } from "./types";

export const MEDITACAO_TEMPLATE: ConsultTemplate = {
  slug: "meditacao",
  emptyValues: () => ({
    currentState: "",
    breathObservation: "",
    techniqueTaught: "",
    sessionDurationMins: "",
    homeFrequency: "",
    postureTips: "",
    bestTimeOfDay: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "currentState", labelKey: "it.tpl.medit.currentState", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 3 },
    { key: "breathObservation", labelKey: "it.tpl.medit.breath", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "techniqueTaught", labelKey: "it.tpl.medit.technique", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "sessionDurationMins", labelKey: "it.tpl.medit.duration", type: "number", sectionKey: "it.tpl.section.intervention" },
    { key: "homeFrequency", labelKey: "it.tpl.medit.frequency", type: "text", sectionKey: "it.tpl.section.plan", placeholderKey: "it.tpl.medit.frequencyHint" },
    { key: "postureTips", labelKey: "it.tpl.medit.posture", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "bestTimeOfDay", labelKey: "it.tpl.medit.timeOfDay", type: "text", sectionKey: "it.tpl.section.plan" },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
