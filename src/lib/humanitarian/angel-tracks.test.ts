import { describe, expect, it } from "vitest";
import { screeningRequirementForTrack, screeningSatisfiesRequirement } from "./angel-tracks";

describe("angel-tracks", () => {
  it("requires VERIFIED for high-risk tracks", () => {
    expect(screeningRequirementForTrack("ESCUTA")).toBe("VERIFIED");
    expect(screeningRequirementForTrack("INTERPRETE")).toBe("VERIFIED");
  });

  it("NONE requirement always passes", () => {
    expect(screeningSatisfiesRequirement("NOT_SUBMITTED", "NONE")).toBe(true);
    expect(screeningSatisfiesRequirement(null, "NONE")).toBe(true);
  });

  it("SUBMITTED requirement accepts submitted/in_review/verified", () => {
    expect(screeningSatisfiesRequirement("SUBMITTED", "SUBMITTED")).toBe(true);
    expect(screeningSatisfiesRequirement("IN_REVIEW", "SUBMITTED")).toBe(true);
    expect(screeningSatisfiesRequirement("VERIFIED", "SUBMITTED")).toBe(true);
    expect(screeningSatisfiesRequirement("NOT_SUBMITTED", "SUBMITTED")).toBe(false);
    expect(screeningSatisfiesRequirement("REJECTED", "SUBMITTED")).toBe(false);
  });

  it("VERIFIED requirement only accepts verified", () => {
    expect(screeningSatisfiesRequirement("VERIFIED", "VERIFIED")).toBe(true);
    expect(screeningSatisfiesRequirement("SUBMITTED", "VERIFIED")).toBe(false);
    expect(screeningSatisfiesRequirement("IN_REVIEW", "VERIFIED")).toBe(false);
    expect(screeningSatisfiesRequirement("NOT_SUBMITTED", "VERIFIED")).toBe(false);
  });
});

