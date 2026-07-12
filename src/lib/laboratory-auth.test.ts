import { describe, expect, it } from "vitest";
import {
  isLaboratoryActive,
  LABORATORY_WRITE_BLOCKED_MESSAGE,
} from "@/lib/laboratory-portal";

describe("isLaboratoryActive", () => {
  it("returns true only for ACTIVE", () => {
    expect(isLaboratoryActive("ACTIVE")).toBe(true);
    expect(isLaboratoryActive("PENDING_REVIEW")).toBe(false);
    expect(isLaboratoryActive("SUSPENDED")).toBe(false);
  });
});

describe("LABORATORY_WRITE_BLOCKED_MESSAGE", () => {
  it("is a non-empty user-facing message", () => {
    expect(LABORATORY_WRITE_BLOCKED_MESSAGE.length).toBeGreaterThan(10);
    expect(LABORATORY_WRITE_BLOCKED_MESSAGE).toMatch(/Laboratório/i);
  });
});
