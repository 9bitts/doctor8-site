import { describe, expect, it } from "vitest";
import {
  B2B_ENTITY_INACTIVE_SSO_MESSAGE,
  isB2BEntityStatusGated,
} from "@/lib/sso/sso-b2b-active";

describe("isB2BEntityStatusGated", () => {
  it("gates pharmacy and laboratory roles only", () => {
    expect(isB2BEntityStatusGated("PHARMACY_STORE")).toBe(true);
    expect(isB2BEntityStatusGated("LABORATORY")).toBe(true);
    expect(isB2BEntityStatusGated("ORGANIZATION")).toBe(false);
    expect(isB2BEntityStatusGated("EMPLOYER")).toBe(false);
  });
});

describe("B2B_ENTITY_INACTIVE_SSO_MESSAGE", () => {
  it("describes inactive entity blocking", () => {
    expect(B2B_ENTITY_INACTIVE_SSO_MESSAGE).toMatch(/aprovação|suspensa/i);
  });
});
