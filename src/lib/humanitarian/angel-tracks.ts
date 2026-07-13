import type { AngelScreeningStatus, AngelTrack } from "@prisma/client";

export type ScreeningRequirement = "NONE" | "SUBMITTED" | "VERIFIED";

export function screeningRequirementForTrack(track: AngelTrack): ScreeningRequirement {
  // High-risk tracks: patient contact and/or sensitive comms.
  if (track === "ESCUTA" || track === "INTERPRETE") return "VERIFIED";
  // Medium risk: operational exposure, on-site work, logistics, etc.
  if (track === "CAMPO" || track === "ENTREGAS" || track === "PROFISSIONAL" || track === "RETAGUARDA") {
    return strictScreeningEnabled() ? "VERIFIED" : "SUBMITTED";
  }
  // Low risk: advocacy / learning.
  return "NONE";
}

export function strictScreeningEnabled(): boolean {
  return (process.env.ANGEL_REQUIRE_SCREENING_STRICT || "").toLowerCase() === "true";
}

export function screeningSatisfiesRequirement(
  screeningStatus: AngelScreeningStatus | null | undefined,
  requirement: ScreeningRequirement,
): boolean {
  if (requirement === "NONE") return true;
  if (requirement === "SUBMITTED") {
    return screeningStatus === "SUBMITTED" || screeningStatus === "IN_REVIEW" || screeningStatus === "VERIFIED";
  }
  return screeningStatus === "VERIFIED";
}

