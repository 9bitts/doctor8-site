import type { ConsultTemplate } from "./types";

export const REFLEXOTERAPIA_TEMPLATE: ConsultTemplate = {
  slug: "reflexoterapia",
  emptyValues: () => ({
    chiefAreas: "",
    reflexFindings: "",
    pointsWorked: "",
    techniques: "",
    selfMassagePoints: "",
    homeFrequency: "",
    cautions: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "chiefAreas", labelKey: "it.tpl.reflex.areas", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "reflexFindings", labelKey: "it.tpl.reflex.findings", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "pointsWorked", labelKey: "it.tpl.reflex.points", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "techniques", labelKey: "it.tpl.reflex.techniques", type: "text", sectionKey: "it.tpl.section.intervention" },
    { key: "selfMassagePoints", labelKey: "it.tpl.reflex.selfMassage", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "homeFrequency", labelKey: "it.tpl.reflex.frequency", type: "text", sectionKey: "it.tpl.section.plan" },
    { key: "cautions", labelKey: "it.tpl.reflex.cautions", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
