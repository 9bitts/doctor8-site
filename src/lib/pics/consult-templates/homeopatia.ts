import type { ConsultTemplate } from "./types";

export const HOMEOPATIA_TEMPLATE: ConsultTemplate = {
  slug: "homeopatia",
  emptyValues: () => ({
    emotionalSymptoms: "",
    physicalSymptoms: "",
    temperamentHabits: "",
    modalities: "",
    nosologicalDiagnosis: "",
    remedy: "",
    potency: "",
    posology: "",
    prognosis: "",
    orientations: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "emotionalSymptoms", labelKey: "it.tpl.homeo.emotional", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 3 },
    { key: "physicalSymptoms", labelKey: "it.tpl.homeo.physical", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 3 },
    { key: "temperamentHabits", labelKey: "it.tpl.homeo.temperament", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "modalities", labelKey: "it.tpl.homeo.modalities", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2, placeholderKey: "it.tpl.homeo.modalitiesHint" },
    { key: "nosologicalDiagnosis", labelKey: "it.tpl.homeo.nosological", type: "text", sectionKey: "it.tpl.section.assessment" },
    { key: "remedy", labelKey: "it.tpl.homeo.remedy", type: "text", sectionKey: "it.tpl.section.prescription" },
    { key: "potency", labelKey: "it.tpl.homeo.potency", type: "text", sectionKey: "it.tpl.section.prescription" },
    { key: "posology", labelKey: "it.tpl.homeo.posology", type: "textarea", sectionKey: "it.tpl.section.prescription", rows: 2 },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "orientations", labelKey: "it.tpl.homeo.orientations", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2, placeholderKey: "it.tpl.homeo.orientationsHint" },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
