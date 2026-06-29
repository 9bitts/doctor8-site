import type { ConsultTemplate } from "./types";

export const AROMATERAPIA_TEMPLATE: ConsultTemplate = {
  slug: "aromaterapia",
  emptyValues: () => ({
    symptoms: "",
    preferences: "",
    oilsSelected: "",
    applicationMethod: "",
    dilution: "",
    homeUse: "",
    cautions: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "symptoms", labelKey: "it.tpl.aroma.symptoms", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "preferences", labelKey: "it.tpl.aroma.preferences", type: "text", sectionKey: "it.tpl.section.assessment" },
    { key: "oilsSelected", labelKey: "it.tpl.aroma.oils", type: "textarea", sectionKey: "it.tpl.section.prescription", rows: 2 },
    { key: "applicationMethod", labelKey: "it.tpl.aroma.application", type: "text", sectionKey: "it.tpl.section.prescription" },
    { key: "dilution", labelKey: "it.tpl.aroma.dilution", type: "text", sectionKey: "it.tpl.section.prescription", placeholderKey: "it.tpl.aroma.dilutionHint" },
    { key: "homeUse", labelKey: "it.tpl.aroma.homeUse", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "cautions", labelKey: "it.tpl.aroma.cautions", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
