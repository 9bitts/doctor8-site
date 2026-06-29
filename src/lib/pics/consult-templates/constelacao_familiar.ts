import type { ConsultTemplate } from "./types";

export const CONSTELACAO_FAMILIAR_TEMPLATE: ConsultTemplate = {
  slug: "constelacao_familiar",
  emptyValues: () => ({
    systemicTheme: "",
    familyContext: "",
    representatives: "",
    movementsObserved: "",
    insights: "",
    integrationPlan: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "systemicTheme", labelKey: "it.tpl.constel.theme", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "familyContext", labelKey: "it.tpl.constel.context", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "representatives", labelKey: "it.tpl.constel.representatives", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "movementsObserved", labelKey: "it.tpl.constel.movements", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "insights", labelKey: "it.tpl.constel.insights", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "integrationPlan", labelKey: "it.tpl.constel.integration", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
