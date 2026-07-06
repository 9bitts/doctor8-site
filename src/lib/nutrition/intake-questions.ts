export type NutritionIntakeQuestion = {
  id: string;
  labelKey: string;
  type: "text" | "number" | "yesno" | "select";
  options?: { value: string; labelKey: string }[];
};

export const NUTRITION_INTAKE_QUESTIONS: NutritionIntakeQuestion[] = [
  { id: "mealsPerDay", labelKey: "nutri.intake.mealsPerDay", type: "number" },
  { id: "waterLiters", labelKey: "nutri.intake.waterLiters", type: "number" },
  { id: "wakeTime", labelKey: "nutri.intake.wakeTime", type: "text" },
  { id: "sleepTime", labelKey: "nutri.intake.sleepTime", type: "text" },
  { id: "physicalActivity", labelKey: "nutri.intake.physicalActivity", type: "select", options: [
    { value: "sedentary", labelKey: "nutri.intake.activity.sedentary" },
    { value: "light", labelKey: "nutri.intake.activity.light" },
    { value: "moderate", labelKey: "nutri.intake.activity.moderate" },
    { value: "intense", labelKey: "nutri.intake.activity.intense" },
  ]},
  { id: "dietaryRestrictions", labelKey: "nutri.intake.dietaryRestrictions", type: "text" },
  { id: "allergies", labelKey: "nutri.intake.allergies", type: "text" },
  { id: "medications", labelKey: "nutri.intake.medications", type: "text" },
  { id: "weightGoal", labelKey: "nutri.intake.weightGoal", type: "select", options: [
    { value: "lose", labelKey: "nutri.intake.goal.lose" },
    { value: "maintain", labelKey: "nutri.intake.goal.maintain" },
    { value: "gain", labelKey: "nutri.intake.goal.gain" },
  ]},
  { id: "variedFoodAccess", labelKey: "nutri.intake.variedFoodAccess", type: "yesno" },
  { id: "cookingHabits", labelKey: "nutri.intake.cookingHabits", type: "text" },
  { id: "weekendHabits", labelKey: "nutri.intake.weekendHabits", type: "text" },
  { id: "chiefComplaint", labelKey: "nutri.intake.chiefComplaint", type: "text" },
];

export type NutritionIntakeResponses = Record<string, string | number | boolean>;
