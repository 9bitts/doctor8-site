import type { ConsultTemplate } from "./types";
import { FLORAL_FORM_OPTIONS } from "../reference-library/floral-products";

const FLORAL_SYSTEMS = [
  { value: "bach", labelKey: "it.tpl.florais.system.bach" },
  { value: "saint_germain", labelKey: "it.tpl.florais.system.sg" },
  { value: "mixed", labelKey: "it.tpl.florais.system.mixed" },
] as const;

const FLORAL_PRESENTATIONS = [
  { value: "gotas_30ml", labelKey: "it.tpl.florais.presentation.floral" },
  { value: "spray", labelKey: "it.tpl.florais.presentation.spray" },
  { value: "estoque", labelKey: "it.tpl.florais.presentation.stock" },
] as const;

export const TERAPIA_FLORAIS_TEMPLATE: ConsultTemplate = {
  slug: "terapia_florais",
  emptyValues: () => ({
    emotionalPicture: "",
    currentStressors: "",
    floralSystem: "",
    floralProduct: "",
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
    {
      key: "floralSystem",
      labelKey: "it.tpl.florais.system",
      type: "select",
      sectionKey: "it.tpl.section.prescription",
      options: [...FLORAL_SYSTEMS],
    },
    {
      key: "floralProduct",
      labelKey: "it.tpl.florais.product",
      type: "select",
      sectionKey: "it.tpl.section.prescription",
      options: [...FLORAL_FORM_OPTIONS],
    },
    { key: "essencesFormula", labelKey: "it.tpl.florais.formula", type: "textarea", sectionKey: "it.tpl.section.prescription", rows: 2 },
    {
      key: "preparation",
      labelKey: "it.tpl.florais.preparation",
      type: "select",
      sectionKey: "it.tpl.section.prescription",
      options: [...FLORAL_PRESENTATIONS],
    },
    { key: "posology", labelKey: "it.tpl.florais.posology", type: "textarea", sectionKey: "it.tpl.section.prescription", rows: 2 },
    { key: "duration", labelKey: "it.tpl.florais.duration", type: "text", sectionKey: "it.tpl.section.plan" },
    { key: "orientations", labelKey: "it.tpl.florais.orientations", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
