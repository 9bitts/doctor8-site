import type { AngelScreeningStatus, AngelTrack, AngelTrackStatus } from "@prisma/client";

export type AngelOnboardingStep =
  | "REGISTERED"
  | "EMAIL"
  | "SCREENING"
  | "TRACKS"
  | "TRAINING"
  | "ACTIVE";

export type AngelOnboardingInput = {
  approvalStatus: string;
  emailVerified: boolean;
  screeningStatus: AngelScreeningStatus | null | undefined;
  trackEnrollments: { track: AngelTrack; status: AngelTrackStatus }[];
  trainingComplete: boolean;
  dashboardActive: boolean;
};

export const ANGEL_ONBOARDING_STEPS: AngelOnboardingStep[] = [
  "REGISTERED",
  "EMAIL",
  "SCREENING",
  "TRACKS",
  "TRAINING",
  "ACTIVE",
];

export function stepIndex(step: AngelOnboardingStep): number {
  return ANGEL_ONBOARDING_STEPS.indexOf(step);
}

/** Current highlighted step in the volunteer onboarding timeline. */
export function resolveAngelOnboardingStep(input: AngelOnboardingInput): AngelOnboardingStep {
  if (input.dashboardActive && input.trainingComplete && input.approvalStatus === "APPROVED") {
    return "ACTIVE";
  }
  if (!input.emailVerified) return "EMAIL";
  if (input.approvalStatus === "PENDING" || input.approvalStatus === "REJECTED") {
    return "SCREENING";
  }
  if (input.approvalStatus === "APPROVED") {
    const hasApprovedTrack = input.trackEnrollments.some((e) => e.status === "APPROVED");
    if (!hasApprovedTrack) return "TRACKS";
    if (!input.trainingComplete) return "TRAINING";
    return "ACTIVE";
  }
  return "REGISTERED";
}
