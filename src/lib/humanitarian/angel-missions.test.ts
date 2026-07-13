import { describe, expect, it } from "vitest";
import {
  computeMissionMatchScore,
  isProfilePaused,
  missionDefaultMinutes,
} from "./angel-missions";

describe("angel-missions", () => {
  it("missionDefaultMinutes uses turn duration when available", () => {
    const starts = new Date("2026-07-15T10:00:00Z");
    const ends = new Date("2026-07-15T12:30:00Z");
    expect(
      missionDefaultMinutes({
        type: "TURNO",
        startsAt: starts,
        endsAt: ends,
        estimatedMinutes: null,
      }),
    ).toBe(150);
  });

  it("missionDefaultMinutes uses estimatedMinutes for TAREFA", () => {
    expect(
      missionDefaultMinutes({
        type: "TAREFA",
        startsAt: null,
        endsAt: null,
        estimatedMinutes: 90,
      }),
    ).toBe(90);
  });

  it("isProfilePaused when availability is PAUSED", () => {
    expect(isProfilePaused("PAUSED", null)).toBe(true);
    expect(isProfilePaused("AVAILABLE", null)).toBe(false);
  });

  it("computeMissionMatchScore rewards language overlap", () => {
    const score = computeMissionMatchScore(
      { languages: ["pt", "es"], city: "São Paulo", skills: ["idiomas"] },
      { requiredLanguages: ["es"], location: "São Paulo, SP", isRemote: false },
    );
    expect(score).toBeGreaterThanOrEqual(15);
  });
});
