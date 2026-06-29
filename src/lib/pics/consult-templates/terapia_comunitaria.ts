import type { ConsultTemplate } from "./types";

export const TERAPIA_COMUNITARIA_TEMPLATE: ConsultTemplate = {
  slug: "terapia_comunitaria",
  emptyValues: () => ({
    communityTheme: "",
    participants: "",
    amplifiers: "",
    rodasHeld: "",
    collectiveInsights: "",
    followUpActions: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "communityTheme", labelKey: "it.tpl.tcom.theme", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "participants", labelKey: "it.tpl.tcom.participants", type: "text", sectionKey: "it.tpl.section.assessment" },
    { key: "amplifiers", labelKey: "it.tpl.tcom.amplifiers", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "rodasHeld", labelKey: "it.tpl.tcom.rodas", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "collectiveInsights", labelKey: "it.tpl.tcom.insights", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "followUpActions", labelKey: "it.tpl.tcom.followUp", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
