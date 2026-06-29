import type { ConsultTemplate } from "./types";

export const NATUROPATIA_TEMPLATE: ConsultTemplate = {
  slug: "naturopatia",
  emptyValues: () => ({
    vitalForce: "",
    lifestyleAssessment: "",
    hydrotherapy: "",
    dietPlan: "",
    supplements: "",
    lifestylePlan: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "vitalForce", labelKey: "it.tpl.naturo.vital", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "lifestyleAssessment", labelKey: "it.tpl.naturo.lifestyle", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "hydrotherapy", labelKey: "it.tpl.naturo.hydro", type: "textarea", sectionKey: "it.tpl.section.prescription", rows: 2 },
    { key: "dietPlan", labelKey: "it.tpl.naturo.diet", type: "textarea", sectionKey: "it.tpl.section.prescription", rows: 2 },
    { key: "supplements", labelKey: "it.tpl.naturo.supplements", type: "textarea", sectionKey: "it.tpl.section.prescription", rows: 2 },
    { key: "lifestylePlan", labelKey: "it.tpl.naturo.plan", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
