import { describe, expect, it } from "vitest";
import { resolveAngelClaimLimit } from "./angel-profile";
import { angelCertMinMinutes } from "./angel-impact";

describe("angel-profile", () => {
  it("resolveAngelClaimLimit caps at global max", () => {
    expect(resolveAngelClaimLimit(15, 10)).toBe(10);
    expect(resolveAngelClaimLimit(5, 10)).toBe(5);
    expect(resolveAngelClaimLimit(null, 10)).toBe(10);
  });
});

describe("angelCertMinMinutes", () => {
  it("defaults to 10 hours in minutes", () => {
    const prev = process.env.ANGEL_CERT_MIN_HOURS;
    delete process.env.ANGEL_CERT_MIN_HOURS;
    expect(angelCertMinMinutes()).toBe(600);
    if (prev !== undefined) process.env.ANGEL_CERT_MIN_HOURS = prev;
  });
});
