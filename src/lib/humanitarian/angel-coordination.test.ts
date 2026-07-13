import { describe, expect, it } from "vitest";
import { isBurnoutRisk } from "./angel-coordination";

describe("angel-coordination", () => {
  it("isBurnoutRisk when stressful outcomes meet threshold in full window", () => {
    expect(isBurnoutRisk(3, 10)).toBe(true);
    expect(isBurnoutRisk(2, 10)).toBe(false);
    expect(isBurnoutRisk(3, 5)).toBe(false);
  });
});
