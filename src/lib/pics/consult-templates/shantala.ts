import type { ConsultTemplate } from "./types";

export const SHANTALA_TEMPLATE: ConsultTemplate = {
  slug: "shantala",
  emptyValues: () => ({
    babyAge: "",
    caregiverName: "",
    techniqueTaught: "",
    bondObservations: "",
    homeFrequency: "",
    cautions: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "babyAge", labelKey: "it.tpl.shantala.babyAge", type: "text", sectionKey: "it.tpl.section.assessment" },
    { key: "caregiverName", labelKey: "it.tpl.shantala.caregiver", type: "text", sectionKey: "it.tpl.section.assessment" },
    { key: "techniqueTaught", labelKey: "it.tpl.shantala.technique", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 3 },
    { key: "bondObservations", labelKey: "it.tpl.shantala.bond", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "homeFrequency", labelKey: "it.tpl.shantala.frequency", type: "text", sectionKey: "it.tpl.section.plan", placeholderKey: "it.tpl.shantala.frequencyHint" },
    { key: "cautions", labelKey: "it.tpl.shantala.cautions", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
