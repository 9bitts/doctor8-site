export type PharmacyIntakeQuestion = {
  id: string;
  labelKey: string;
  type: "text" | "number" | "yesno" | "select";
  options?: { value: string; labelKey: string }[];
};

export const PHARMACY_INTAKE_QUESTIONS: PharmacyIntakeQuestion[] = [
  { id: "currentMedications", labelKey: "pharma.intake.currentMedications", type: "text" },
  { id: "allergies", labelKey: "pharma.intake.allergies", type: "text" },
  { id: "adherence", labelKey: "pharma.intake.adherence", type: "select", options: [
    { value: "good", labelKey: "pharma.intake.adherence.good" },
    { value: "partial", labelKey: "pharma.intake.adherence.partial" },
    { value: "poor", labelKey: "pharma.intake.adherence.poor" },
  ]},
  { id: "sideEffects", labelKey: "pharma.intake.sideEffects", type: "text" },
  { id: "otcSupplements", labelKey: "pharma.intake.otcSupplements", type: "text" },
  { id: "pregnancyLactation", labelKey: "pharma.intake.pregnancyLactation", type: "yesno" },
  { id: "renalHepatic", labelKey: "pharma.intake.renalHepatic", type: "text" },
  { id: "goals", labelKey: "pharma.intake.goals", type: "text" },
];

export type PharmacyIntakeResponses = Record<string, string | number | boolean>;
