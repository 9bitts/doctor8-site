import type { ConsultTemplate } from "./types";

export const APITERAPIA_TEMPLATE: ConsultTemplate = {
  slug: "apiterapia",
  emptyValues: () => ({
    indication: "",
    allergyCheck: "",
    productsUsed: "",
    application: "",
    cautions: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "indication", labelKey: "it.tpl.api.indication", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "allergyCheck", labelKey: "it.tpl.api.allergy", type: "text", sectionKey: "it.tpl.section.assessment" },
    { key: "productsUsed", labelKey: "it.tpl.api.products", type: "textarea", sectionKey: "it.tpl.section.prescription", rows: 2 },
    { key: "application", labelKey: "it.tpl.api.application", type: "textarea", sectionKey: "it.tpl.section.prescription", rows: 2 },
    { key: "cautions", labelKey: "it.tpl.api.cautions", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
