import type { ConsultTemplate } from "./types";

export const TERAPIA_FLORAIS_TEMPLATE: ConsultTemplate = {
  slug: "terapia_florais",
  emptyValues: () => ({
    emotionalPicture: "",
    currentStressors: "",
    essencesFormula: "",
    preparation: "",
    posology: "",
    duration: "",
    orientations: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "emotionalPicture", labelKey: "it.tpl.florais.emotional", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 3 },
    { key: "currentStressors", labelKey: "it.tpl.florais.stressors", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "essencesFormula", labelKey: "it.tpl.florais.formula", type: "textarea", sectionKey: "it.tpl.section.prescription", rows: 2 },
    { key: "preparation", labelKey: "it.tpl.florais.preparation", type: "text", sectionKey: "it.tpl.section.prescription" },
    { key: "posology", labelKey: "it.tpl.florais.posology", type: "textarea", sectionKey: "it.tpl.section.prescription", rows: 2 },
    { key: "duration", labelKey: "it.tpl.florais.duration", type: "text", sectionKey: "it.tpl.section.plan" },
    { key: "orientations", labelKey: "it.tpl.florais.orientations", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
