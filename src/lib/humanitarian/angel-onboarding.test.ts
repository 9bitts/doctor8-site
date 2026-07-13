import { describe, expect, it } from "vitest";
import { resolveAngelOnboardingStep } from "./angel-onboarding";

describe("resolveAngelOnboardingStep", () => {
  const base = {
    screeningStatus: "VERIFIED" as const,
    trackEnrollments: [{ track: "ESCUTA" as const, status: "APPROVED" as const }],
    trainingComplete: true,
    dashboardActive: true,
  };

  it("returns EMAIL when email is not verified", () => {
    expect(
      resolveAngelOnboardingStep({
        ...base,
        approvalStatus: "PENDING",
        emailVerified: false,
        dashboardActive: false,
      }),
    ).toBe("EMAIL");
  });

  it("returns SCREENING while global approval is pending", () => {
    expect(
      resolveAngelOnboardingStep({
        ...base,
        approvalStatus: "PENDING",
        emailVerified: true,
        dashboardActive: false,
      }),
    ).toBe("SCREENING");
  });

  it("returns TRACKS when approved but no track is approved", () => {
    expect(
      resolveAngelOnboardingStep({
        ...base,
        approvalStatus: "APPROVED",
        emailVerified: true,
        trackEnrollments: [{ track: "ESCUTA", status: "INTERESTED" }],
        dashboardActive: false,
      }),
    ).toBe("TRACKS");
  });

  it("returns TRAINING when track approved but training incomplete", () => {
    expect(
      resolveAngelOnboardingStep({
        ...base,
        approvalStatus: "APPROVED",
        emailVerified: true,
        trainingComplete: false,
        dashboardActive: false,
      }),
    ).toBe("TRAINING");
  });

  it("returns ACTIVE when dashboard is active and training complete", () => {
    expect(
      resolveAngelOnboardingStep({
        ...base,
        approvalStatus: "APPROVED",
        emailVerified: true,
      }),
    ).toBe("ACTIVE");
  });
});
