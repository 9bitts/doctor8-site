import type { ConsultTemplate } from "./types";

export const BIOENERGETICA_TEMPLATE: ConsultTemplate = {
  slug: "bioenergetica",
  emptyValues: () => ({
    bodyTension: "",
    emotionalBlock: "",
    exercisesApplied: "",
    breathingWork: "",
    homeExercises: "",
    frequency: "",
    prognosis: "",
    additionalNotes: "",
  }),
  fields: [
    { key: "bodyTension", labelKey: "it.tpl.bioen.tension", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "emotionalBlock", labelKey: "it.tpl.bioen.emotional", type: "textarea", sectionKey: "it.tpl.section.assessment", rows: 2 },
    { key: "exercisesApplied", labelKey: "it.tpl.bioen.exercises", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "breathingWork", labelKey: "it.tpl.bioen.breathing", type: "textarea", sectionKey: "it.tpl.section.intervention", rows: 2 },
    { key: "homeExercises", labelKey: "it.tpl.bioen.home", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "frequency", labelKey: "it.tpl.bioen.frequency", type: "text", sectionKey: "it.tpl.section.plan" },
    { key: "prognosis", labelKey: "it.tpl.common.prognosis", type: "textarea", sectionKey: "it.tpl.section.plan", rows: 2 },
    { key: "additionalNotes", labelKey: "it.tpl.common.additional", type: "textarea", sectionKey: "it.tpl.section.notes", rows: 2 },
  ],
};
