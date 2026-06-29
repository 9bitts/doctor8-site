import type { ConsultTemplate } from "./types";

export const QUIROPRAXIA_TEMPLATE: ConsultTemplate = {
  slug: "quiropraxia",
  emptyValues: () => ({
    subluxations: "",
    postureFindings: "",
    adjustments: "",
    regionsTreated: "",
    homeCare: "",
    cautions: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "subluxations", labelKey: "it.tpl.quiro.subluxations", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "postureFindings", labelKey: "it.tpl.quiro.posture", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "adjustments", labelKey: "it.tpl.quiro.adjustments", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "regionsTreated", labelKey: "it.tpl.quiro.regions", type: "text", sectionKey: "it.tpl.section.intervention" },
    { key: "homeCare", labelKey: "it.tpl.quiro.home", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "cautions", labelKey: "it.tpl.quiro.cautions", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
