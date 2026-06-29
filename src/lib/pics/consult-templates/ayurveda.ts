import type { ConsultTemplate } from "./types";

const DOSHA_OPTIONS = [
  { value: "vata", labelKey: "it.tpl.ayur.vata" },
  { value: "pitta", labelKey: "it.tpl.ayur.pitta" },
  { value: "kapha", labelKey: "it.tpl.ayur.kapha" },
  { value: "mixed", labelKey: "it.tpl.ayur.mixed" },
];

export const AYURVEDA_TEMPLATE: ConsultTemplate = {
  slug: "ayurveda",
  emptyValues: () => ({
    constitution: "",
    imbalance: "",
    dietRecommendations: "",
    routineRecommendations: "",
    herbsOrOils: "",
    lifestyleTips: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "constitution", labelKey: "it.tpl.ayur.constitution", type: "select", sectionKey: "it.tpl.section.assessment", options: DOSHA_OPTIONS },
    { key: "imbalance", labelKey: "it.tpl.ayur.imbalance", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "dietRecommendations", labelKey: "it.tpl.ayur.diet", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "routineRecommendations", labelKey: "it.tpl.ayur.routine", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "herbsOrOils", labelKey: "it.tpl.ayur.herbs", type: "textarea", sectionKey: "it.tpl.section.prescription", rows: 2 },
    { key: "lifestyleTips", labelKey: "it.tpl.ayur.lifestyle", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
