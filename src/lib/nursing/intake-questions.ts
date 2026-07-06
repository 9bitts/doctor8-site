export type NursingIntakeQuestion = {
  id: string;
  labelKey: string;
  type: "text" | "number" | "yesno" | "select";
  options?: { value: string; labelKey: string }[];
};

export const NURSING_INTAKE_QUESTIONS: NursingIntakeQuestion[] = [
  { id: "chiefComplaint", labelKey: "nurse.intake.chiefComplaint", type: "text" },
  { id: "allergies", labelKey: "nurse.intake.allergies", type: "text" },
  { id: "medications", labelKey: "nurse.intake.medications", type: "text" },
  { id: "painLevel", labelKey: "nurse.intake.painLevel", type: "number" },
  { id: "mobility", labelKey: "nurse.intake.mobility", type: "select", options: [
    { value: "independent", labelKey: "nurse.intake.mobility.independent" },
    { value: "assisted", labelKey: "nurse.intake.mobility.assisted" },
    { value: "bedbound", labelKey: "nurse.intake.mobility.bedbound" },
  ]},
  { id: "fallHistory", labelKey: "nurse.intake.fallHistory", type: "yesno" },
  { id: "skinCondition", labelKey: "nurse.intake.skinCondition", type: "text" },
  { id: "sleepQuality", labelKey: "nurse.intake.sleepQuality", type: "select", options: [
    { value: "good", labelKey: "nurse.intake.sleep.good" },
    { value: "fair", labelKey: "nurse.intake.sleep.fair" },
    { value: "poor", labelKey: "nurse.intake.sleep.poor" },
  ]},
  { id: "appetite", labelKey: "nurse.intake.appetite", type: "select", options: [
    { value: "normal", labelKey: "nurse.intake.appetite.normal" },
    { value: "reduced", labelKey: "nurse.intake.appetite.reduced" },
    { value: "none", labelKey: "nurse.intake.appetite.none" },
  ]},
  { id: "supportNetwork", labelKey: "nurse.intake.supportNetwork", type: "text" },
];

export type NursingIntakeResponses = Record<string, string | number | boolean>;
