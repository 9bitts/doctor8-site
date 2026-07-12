import { describe, expect, it } from "vitest";
import { mapProfessionalPathForNutritionistSpecialty } from "@/lib/nutritionist-portal";

describe("mapProfessionalPathForNutritionistSpecialty", () => {
  it("maps professional paths for nutritionist specialty", () => {
    expect(
      mapProfessionalPathForNutritionistSpecialty("Nutritionist", "/professional/settings"),
    ).toBe("/nutricionista/settings");
    expect(
      mapProfessionalPathForNutritionistSpecialty("Nutritionist", "/professional"),
    ).toBe("/nutricionista");
  });

  it("leaves paths unchanged for non-nutrition specialties", () => {
    expect(
      mapProfessionalPathForNutritionistSpecialty("General Practice", "/professional"),
    ).toBe("/professional");
    expect(
      mapProfessionalPathForNutritionistSpecialty(null, "/nutricionista/patients"),
    ).toBe("/nutricionista/patients");
  });
});
