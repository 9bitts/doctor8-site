import { describe, it, expect } from "vitest";
import { isB2BSsoRole } from "./sso-orgs";

describe("sso-orgs", () => {
  it("identifies B2B SSO roles", () => {
    expect(isB2BSsoRole("ORGANIZATION")).toBe(true);
    expect(isB2BSsoRole("EMPLOYER")).toBe(true);
    expect(isB2BSsoRole("PHARMACY_STORE")).toBe(true);
    expect(isB2BSsoRole("LABORATORY")).toBe(true);
    expect(isB2BSsoRole("PROFESSIONAL")).toBe(false);
  });
});
