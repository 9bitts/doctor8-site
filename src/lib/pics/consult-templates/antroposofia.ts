import type { ConsultTemplate } from "./types";

export const ANTROPOSOFIA_TEMPLATE: ConsultTemplate = {
  slug: "antroposofia",
  emptyValues: () => ({
    biographicalRhythm: "",
    constitution: "",
    anthroposophicDiagnosis: "",
    remediesPrescribed: "",
    rhythmOrientations: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "biographicalRhythm", labelKey: "it.tpl.antro.rhythm", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "constitution", labelKey: "it.tpl.antro.constitution", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "anthroposophicDiagnosis", labelKey: "it.tpl.antro.diagnosis", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "remediesPrescribed", labelKey: "it.tpl.antro.remedies", type: "textarea", sectionKey: "it.tpl.section.prescription", rows: 2 },
    { key: "rhythmOrientations", labelKey: "it.tpl.antro.orientations", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
