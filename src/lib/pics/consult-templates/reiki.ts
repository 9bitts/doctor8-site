import type { ConsultTemplate } from "./types";

export const REIKI_TEMPLATE: ConsultTemplate = {
  slug: "reiki",
  emptyValues: () => ({
    energyState: "",
    areasOfFocus: "",
    handPositions: "",
    symbolsUsed: "",
    sessionObservations: "",
    homeFrequency: "",
    selfCareTips: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "energyState", labelKey: "it.tpl.reiki.energyState", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "areasOfFocus", labelKey: "it.tpl.reiki.areas", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "handPositions", labelKey: "it.tpl.reiki.positions", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "symbolsUsed", labelKey: "it.tpl.reiki.symbols", type: "text", sectionKey: "it.tpl.section.intervention" },
    { key: "sessionObservations", labelKey: "it.tpl.reiki.observations", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "homeFrequency", labelKey: "it.tpl.reiki.frequency", type: "text", sectionKey: "it.tpl.section.plan", placeholderKey: "it.tpl.medit.frequencyHint" },
    { key: "selfCareTips", labelKey: "it.tpl.reiki.selfCare", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
