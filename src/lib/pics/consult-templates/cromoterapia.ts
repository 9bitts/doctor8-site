import type { ConsultTemplate } from "./types";

export const CROMOTERAPIA_TEMPLATE: ConsultTemplate = {
  slug: "cromoterapia",
  emptyValues: () => ({
    emotionalState: "",
    areasTargeted: "",
    colorsUsed: "",
    exposureMethod: "",
    homeApplication: "",
    cautions: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "emotionalState", labelKey: "it.tpl.cromo.emotional", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "areasTargeted", labelKey: "it.tpl.cromo.areas", type: "text", sectionKey: "it.tpl.section.assessment" },
    { key: "colorsUsed", labelKey: "it.tpl.cromo.colors", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "exposureMethod", labelKey: "it.tpl.cromo.method", type: "text", sectionKey: "it.tpl.section.intervention" },
    { key: "homeApplication", labelKey: "it.tpl.cromo.home", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "cautions", labelKey: "it.tpl.cromo.cautions", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
