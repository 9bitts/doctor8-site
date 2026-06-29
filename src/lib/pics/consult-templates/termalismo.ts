import type { ConsultTemplate } from "./types";

export const TERMALISMO_TEMPLATE: ConsultTemplate = {
  slug: "termalismo",
  emptyValues: () => ({
    indication: "",
    waterType: "",
    temperature: "",
    duration: "",
    procedures: "",
    postBathCare: "",
    cautions: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "indication", labelKey: "it.tpl.termal.indication", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "waterType", labelKey: "it.tpl.termal.water", type: "text", sectionKey: "it.tpl.section.intervention" },
    { key: "temperature", labelKey: "it.tpl.termal.temperature", type: "text", sectionKey: "it.tpl.section.intervention" },
    { key: "duration", labelKey: "it.tpl.termal.duration", type: "text", sectionKey: "it.tpl.section.intervention" },
    { key: "procedures", labelKey: "it.tpl.termal.procedures", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "postBathCare", labelKey: "it.tpl.termal.postCare", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "cautions", labelKey: "it.tpl.termal.cautions", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
