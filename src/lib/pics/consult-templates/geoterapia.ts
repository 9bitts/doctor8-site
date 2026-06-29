import type { ConsultTemplate } from "./types";

export const GEOTERAPIA_TEMPLATE: ConsultTemplate = {
  slug: "geoterapia",
  emptyValues: () => ({
    intention: "",
    stonesUsed: "",
    placement: "",
    sessionDuration: "",
    homeUse: "",
    cautions: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "intention", labelKey: "it.tpl.geo.intention", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "stonesUsed", labelKey: "it.tpl.geo.stones", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "placement", labelKey: "it.tpl.geo.placement", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "sessionDuration", labelKey: "it.tpl.geo.duration", type: "text", sectionKey: "it.tpl.section.intervention" },
    { key: "homeUse", labelKey: "it.tpl.geo.home", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "cautions", labelKey: "it.tpl.geo.cautions", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
