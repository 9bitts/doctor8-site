import type { ConsultTemplate } from "./types";

export const OZONIOTERAPIA_TEMPLATE: ConsultTemplate = {
  slug: "ozonioterapia",
  emptyValues: () => ({
    clinicalIndication: "",
    contraindicationsChecked: "",
    route: "",
    dose: "",
    sessionProtocol: "",
    postSessionCare: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "clinicalIndication", labelKey: "it.tpl.ozonio.indication", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "contraindicationsChecked", labelKey: "it.tpl.ozonio.contraindications", type: "text", sectionKey: "it.tpl.section.assessment" },
    { key: "route", labelKey: "it.tpl.ozonio.route", type: "text", sectionKey: "it.tpl.section.intervention" },
    { key: "dose", labelKey: "it.tpl.ozonio.dose", type: "text", sectionKey: "it.tpl.section.intervention" },
    { key: "sessionProtocol", labelKey: "it.tpl.ozonio.protocol", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "postSessionCare", labelKey: "it.tpl.ozonio.postCare", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
