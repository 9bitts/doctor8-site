import { describe, expect, it } from "vitest";
import { isDentistSpecialty, isNutritionistSpecialty } from "@/lib/profession-label";

describe("isNutritionistSpecialty", () => {
  it("recognizes nutrition specialties", () => {
    expect(isNutritionistSpecialty("Nutritionist")).toBe(true);
    expect(isNutritionistSpecialty("Dietitian")).toBe(true);
    expect(isNutritionistSpecialty("Nutrition")).toBe(true);
  });

  it("rejects empty and other specialties", () => {
    expect(isNutritionistSpecialty(null)).toBe(false);
    expect(isNutritionistSpecialty("")).toBe(false);
    expect(isNutritionistSpecialty("Nurse")).toBe(false);
    expect(isNutritionistSpecialty("General Practice")).toBe(false);
  });
});

describe("isDentistSpecialty", () => {
  it("recognizes dentist specialties", () => {
    expect(isDentistSpecialty("Dentist (General)")).toBe(true);
    expect(isDentistSpecialty("Orthodontist")).toBe(true);
    expect(isDentistSpecialty("Dentista")).toBe(true);
  });

  it("rejects empty and other specialties", () => {
    expect(isDentistSpecialty(null)).toBe(false);
    expect(isDentistSpecialty("Nutritionist")).toBe(false);
    expect(isDentistSpecialty("General Practice")).toBe(false);
  });
});
