import type { ConsultTemplate } from "./types";

const PRESENTATIONS = [
  { value: "capsula", labelKey: "it.tpl.phyto.pres.capsula" },
  { value: "comprimido", labelKey: "it.tpl.phyto.pres.comprimido" },
  { value: "tintura", labelKey: "it.tpl.phyto.pres.tintura" },
  { value: "cha", labelKey: "it.tpl.phyto.pres.cha" },
  { value: "xarope", labelKey: "it.tpl.phyto.pres.xarope" },
  { value: "gel", labelKey: "it.tpl.phyto.pres.gel" },
  { value: "po", labelKey: "it.tpl.phyto.pres.po" },
] as const;

export const FITOTERAPIA_TEMPLATE: ConsultTemplate = {
  slug: "fitoterapia",
  emptyValues: () => ({
    indication: "",
    product: "",
    productOther: "",
    presentation: "",
    preparation: "",
    dose: "",
    duration: "",
    safetyReviewed: false,
    patientOrientations: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "indication", labelKey: "it.tpl.phyto.indication", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    {
      key: "product",
      labelKey: "it.tpl.phyto.product",
      type: "text",
      sectionKey: "it.tpl.section.prescription",
      placeholderKey: "it.tpl.phyto.productCatalogHint",
    },
    { key: "productOther", labelKey: "it.tpl.phyto.productOther", type: "text", sectionKey: "it.tpl.section.prescription" },
    {
      key: "presentation",
      labelKey: "it.tpl.phyto.presentation",
      type: "select",
      sectionKey: "it.tpl.section.prescription",
      options: [...PRESENTATIONS],
    },
    { key: "preparation", labelKey: "it.tpl.phyto.preparation", type: "textarea", sectionKey: "it.tpl.section.prescription", rows: 2, placeholderKey: "it.tpl.phyto.preparationHint" },
    { key: "dose", labelKey: "it.tpl.phyto.dose", type: "textarea", sectionKey: "it.tpl.section.prescription", rows: 2, placeholderKey: "it.tpl.phyto.doseHint" },
    { key: "duration", labelKey: "it.tpl.phyto.duration", type: "text", sectionKey: "it.tpl.section.plan" },
    { key: "safetyReviewed", labelKey: "it.tpl.phyto.safety", type: "checkbox", sectionKey: "it.tpl.section.plan" },
    { key: "patientOrientations", labelKey: "it.tpl.phyto.orientations", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 3 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
