export type ConsultStepId = "welcome" | "assessment" | "intervention" | "plan" | "close";

export const CONSULT_STEPS: ConsultStepId[] = [
  "welcome",
  "assessment",
  "intervention",
  "plan",
  "close",
];

export const CONSULT_STEP_LABEL_KEYS: Record<ConsultStepId, string> = {
  welcome: "it.consult.step.welcome",
  assessment: "it.consult.step.assessment",
  intervention: "it.consult.step.intervention",
  plan: "it.consult.step.plan",
  close: "it.consult.step.close",
};

/** Maps consult wizard steps to template section keys. */
export const CONSULT_STEP_SECTIONS: Record<ConsultStepId, string[]> = {
  welcome: [],
  assessment: ["it.tpl.section.assessment"],
  intervention: ["it.tpl.section.intervention", "it.tpl.section.prescription"],
  plan: ["it.tpl.section.plan"],
  close: ["it.tpl.section.notes"],
};
