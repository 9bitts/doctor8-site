import { describe, expect, it } from "vitest";
import {
  HUMANITARIAN_PATIENT_HOME,
  isHumanitarianAcquisitionChannel,
  isHumanitarianPatientAllowedPatientPath,
  resolvePatientRoleHome,
  shouldRedirectHumanitarianPatientFromPatientRoute,
} from "@/lib/humanitarian/patient-identity";
import { PatientAcquisitionChannel } from "@prisma/client";

describe("patient-identity", () => {
  it("detects ACURA humanitarian acquisition channel only", () => {
    expect(isHumanitarianAcquisitionChannel(PatientAcquisitionChannel.ACURA_SOS_FORM)).toBe(true);
    expect(isHumanitarianAcquisitionChannel(PatientAcquisitionChannel.DOCTOR8_HUMANITARIAN)).toBe(false);
    expect(isHumanitarianAcquisitionChannel(PatientAcquisitionChannel.DOCTOR8_SOS_LANDING)).toBe(false);
    expect(isHumanitarianAcquisitionChannel(PatientAcquisitionChannel.REGULAR)).toBe(false);
    expect(isHumanitarianAcquisitionChannel(null)).toBe(false);
  });

  it("resolves patient home by profile type", () => {
    expect(resolvePatientRoleHome({ humanitarianPatient: true })).toBe(HUMANITARIAN_PATIENT_HOME);
    expect(resolvePatientRoleHome({ humanitarianPatient: false })).toBe("/patient");
    expect(resolvePatientRoleHome()).toBe("/patient");
  });

  it("allows clinical patient subroutes for humanitarian patients", () => {
    expect(isHumanitarianPatientAllowedPatientPath("/patient/prescriptions")).toBe(true);
    expect(isHumanitarianPatientAllowedPatientPath("/patient/messages/123")).toBe(true);
    expect(isHumanitarianPatientAllowedPatientPath("/patient/find")).toBe(false);
    expect(isHumanitarianPatientAllowedPatientPath("/patient")).toBe(false);
  });

  it("redirects blocked patient routes for humanitarian patients", () => {
    expect(shouldRedirectHumanitarianPatientFromPatientRoute("/patient", true)).toBe(true);
    expect(shouldRedirectHumanitarianPatientFromPatientRoute("/patient/urgent", true)).toBe(true);
    expect(
      shouldRedirectHumanitarianPatientFromPatientRoute("/patient/prescriptions", true),
    ).toBe(false);
    expect(shouldRedirectHumanitarianPatientFromPatientRoute("/patient", false)).toBe(false);
  });
});
