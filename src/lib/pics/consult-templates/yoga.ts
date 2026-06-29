import type { ConsultTemplate } from "./types";

export const YOGA_TEMPLATE: ConsultTemplate = {
  slug: "yoga",
  emptyValues: () => ({
    limitations: "",
    goals: "",
    practicesTaught: "",
    breathingNotes: "",
    homeFrequency: "",
    cautions: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "limitations", labelKey: "it.tpl.yoga.limitations", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "goals", labelKey: "it.tpl.yoga.goals", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "practicesTaught", labelKey: "it.tpl.yoga.practices", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 3, placeholderKey: "it.tpl.yoga.practicesHint" },
    { key: "breathingNotes", labelKey: "it.tpl.yoga.breathing", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "homeFrequency", labelKey: "it.tpl.yoga.frequency", type: "text", sectionKey: "it.tpl.section.plan", placeholderKey: "it.tpl.medit.frequencyHint" },
    { key: "cautions", labelKey: "it.tpl.yoga.cautions", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
