import { describe, expect, it } from "vitest";
import { assertCannabisPrescriptionAllowed } from "@/lib/cannabis-prescription-gate";
import { canPrescribeCannabisMedicinal } from "@/lib/profession-label";

describe("canPrescribeCannabisMedicinal", () => {
  it("allows physicians and dentists", () => {
    expect(canPrescribeCannabisMedicinal("Cardiology")).toBe(true);
    expect(canPrescribeCannabisMedicinal("Dentist (General)")).toBe(true);
  });

  it("denies other professions", () => {
    expect(canPrescribeCannabisMedicinal("Nutritionist")).toBe(false);
    expect(canPrescribeCannabisMedicinal("Psychologist")).toBe(false);
  });
});

describe("assertCannabisPrescriptionAllowed", () => {
  it("allows non-cannabis prescriptions for any profession", () => {
    expect(
      assertCannabisPrescriptionAllowed("Nutritionist", [
        { itemKind: "phytotherapy", name: "x" } as never,
      ]).ok,
    ).toBe(true);
  });

  it("blocks cannabis items for nutritionist", () => {
    const result = assertCannabisPrescriptionAllowed("Nutritionist", [
      { itemKind: "cannabis" },
    ]);
    expect(result.ok).toBe(false);
  });

  it("allows cannabis items for dentist", () => {
    const result = assertCannabisPrescriptionAllowed("Dentist (General)", [
      { itemKind: "cannabis" },
    ]);
    expect(result.ok).toBe(true);
  });
});
