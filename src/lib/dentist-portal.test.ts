import { describe, expect, it } from "vitest";
import { mapProfessionalPathForDentistSpecialty } from "@/lib/dentist-portal";

describe("mapProfessionalPathForDentistSpecialty", () => {
  it("maps professional paths for dentist specialty", () => {
    expect(
      mapProfessionalPathForDentistSpecialty("Dentist (General)", "/professional/settings"),
    ).toBe("/odontologo/settings");
    expect(
      mapProfessionalPathForDentistSpecialty("Orthodontist", "/professional"),
    ).toBe("/odontologo");
    expect(
      mapProfessionalPathForDentistSpecialty("Dentist (General)", "/professional/prescriptions"),
    ).toBe("/odontologo/prescriptions");
    expect(
      mapProfessionalPathForDentistSpecialty("Dentist (General)", "/professional/jit"),
    ).toBe("/odontologo/jit");
  });

  it("leaves paths unchanged for non-dentist specialties", () => {
    expect(
      mapProfessionalPathForDentistSpecialty("General Practice", "/professional"),
    ).toBe("/professional");
    expect(
      mapProfessionalPathForDentistSpecialty(null, "/odontologo/patients"),
    ).toBe("/odontologo/patients");
  });
});
