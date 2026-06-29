import type { ConsultTemplate } from "./types";

export const DANCA_CIRCULAR_TEMPLATE: ConsultTemplate = {
  slug: "danca_circular",
  emptyValues: () => ({
    groupDynamics: "",
    participantState: "",
    dancesLed: "",
    circleObservations: "",
    homePractice: "",
    frequency: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "groupDynamics", labelKey: "it.tpl.dcircular.dynamics", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "participantState", labelKey: "it.tpl.dcircular.state", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "dancesLed", labelKey: "it.tpl.dcircular.dances", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "circleObservations", labelKey: "it.tpl.dcircular.observations", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "homePractice", labelKey: "it.tpl.dcircular.home", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "frequency", labelKey: "it.tpl.dcircular.frequency", type: "text", sectionKey: "it.tpl.section.plan" },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
