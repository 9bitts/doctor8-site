import type { ConsultTemplate } from "./types";

export const OSTEOPATIA_TEMPLATE: ConsultTemplate = {
  slug: "osteopatia",
  emptyValues: () => ({
    somaticDysfunction: "",
    mobilityFindings: "",
    techniquesApplied: "",
    treatedAreas: "",
    homeExercises: "",
    cautions: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "somaticDysfunction", labelKey: "it.tpl.osteo.dysfunction", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "mobilityFindings", labelKey: "it.tpl.osteo.mobility", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "techniquesApplied", labelKey: "it.tpl.osteo.techniques", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "treatedAreas", labelKey: "it.tpl.osteo.areas", type: "text", sectionKey: "it.tpl.section.intervention" },
    { key: "homeExercises", labelKey: "it.tpl.osteo.home", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "cautions", labelKey: "it.tpl.osteo.cautions", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
