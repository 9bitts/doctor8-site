import type { ConsultTemplate } from "./types";

export const IMPOSICAO_MAOS_TEMPLATE: ConsultTemplate = {
  slug: "imposicao_maos",
  emptyValues: () => ({
    intention: "",
    areasOfFocus: "",
    handPositions: "",
    sessionObservations: "",
    spiritualOrientations: "",
    homeFrequency: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "intention", labelKey: "it.tpl.impos.intention", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "areasOfFocus", labelKey: "it.tpl.impos.areas", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "handPositions", labelKey: "it.tpl.impos.positions", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "sessionObservations", labelKey: "it.tpl.impos.observations", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "spiritualOrientations", labelKey: "it.tpl.impos.orientations", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "homeFrequency", labelKey: "it.tpl.impos.frequency", type: "text", sectionKey: "it.tpl.section.plan" },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
