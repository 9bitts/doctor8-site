import { describe, expect, it } from "vitest";
import {
  resolveProfessionalSignupParams,
  resolveRegisterProfessionSlug,
} from "@/lib/professional-signup-params";

describe("resolveProfessionalSignupParams", () => {
  it("portal=nutritionist wins over profession and role", () => {
    expect(
      resolveProfessionalSignupParams({
        portal: "nutritionist",
        role: "PROFESSIONAL",
        profession: "nutricionista",
      }),
    ).toEqual({
      role: "NUTRITIONIST",
      professionSlug: "nutricionista",
      step: 2,
    });
  });

  it("portal=nurse sets nurse slug", () => {
    expect(resolveProfessionalSignupParams({ portal: "nurse" })).toEqual({
      role: "NURSE",
      professionSlug: "enfermeiro",
      step: 2,
    });
  });

  it("portal=pharmacist sets pharmacist slug", () => {
    expect(resolveProfessionalSignupParams({ portal: "pharmacist" })).toEqual({
      role: "PHARMACIST",
      professionSlug: "farmaceutico",
      step: 2,
    });
  });

  it("portal=dentist sets dentist slug", () => {
    expect(resolveProfessionalSignupParams({ portal: "dentist" })).toEqual({
      role: "DENTIST",
      professionSlug: "dentista",
      step: 2,
    });
  });

  it("portal=psychologist sets psychologist role", () => {
    expect(resolveProfessionalSignupParams({ portal: "psychologist" })).toEqual({
      role: "PSYCHOLOGIST",
      professionSlug: undefined,
      step: 2,
    });
  });

  it("role=PROFESSIONAL clears slug", () => {
    expect(resolveProfessionalSignupParams({ role: "PROFESSIONAL" })).toEqual({
      role: "PROFESSIONAL",
      professionSlug: undefined,
      step: 2,
    });
  });

  it("role=PSYCHOANALYST", () => {
    expect(resolveProfessionalSignupParams({ role: "PSYCHOANALYST" })).toEqual({
      role: "PSYCHOANALYST",
      professionSlug: undefined,
      step: 2,
    });
  });

  it("role=INTEGRATIVE_THERAPIST", () => {
    expect(resolveProfessionalSignupParams({ role: "INTEGRATIVE_THERAPIST" })).toEqual({
      role: "INTEGRATIVE_THERAPIST",
      professionSlug: undefined,
      step: 2,
    });
  });

  it("profession=nutricionista without portal", () => {
    expect(resolveProfessionalSignupParams({ profession: "nutricionista" })).toEqual({
      role: "PROFESSIONAL",
      professionSlug: "nutricionista",
      step: 2,
    });
  });

  it("profession=psicologo maps to psychologist", () => {
    expect(resolveProfessionalSignupParams({ profession: "psicologo" })).toEqual({
      role: "PSYCHOLOGIST",
      professionSlug: undefined,
      step: 2,
    });
  });

  it("defaults to step 1 generic professional", () => {
    expect(resolveProfessionalSignupParams({})).toEqual({
      role: "PROFESSIONAL",
      professionSlug: undefined,
      step: 1,
    });
  });
});

describe("resolveRegisterProfessionSlug", () => {
  it("clears slug for generic professional", () => {
    expect(resolveRegisterProfessionSlug("PROFESSIONAL", "nutricionista")).toBe("nutricionista");
    expect(resolveRegisterProfessionSlug("PROFESSIONAL", undefined)).toBeUndefined();
  });

  it("maps portal UI roles to slugs", () => {
    expect(resolveRegisterProfessionSlug("NUTRITIONIST", undefined)).toBe("nutricionista");
    expect(resolveRegisterProfessionSlug("NURSE", undefined)).toBe("enfermeiro");
    expect(resolveRegisterProfessionSlug("PHARMACIST", undefined)).toBe("farmaceutico");
    expect(resolveRegisterProfessionSlug("DENTIST", undefined)).toBe("dentista");
  });
});
