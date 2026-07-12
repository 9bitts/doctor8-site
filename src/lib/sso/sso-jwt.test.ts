import { describe, it, expect } from "vitest";
import { issueAccessToken, verifyAccessToken } from "./sso-jwt";

describe("sso access token", () => {
  it("embeds organization_id when provided", () => {
    const token = issueAccessToken({
      sub: "user-1",
      aud: "vital8",
      scope: "openid email profile",
      organizationId: "org-abc",
    });

    const parsed = verifyAccessToken(token);
    expect(parsed?.sub).toBe("user-1");
    expect(parsed?.organizationId).toBe("org-abc");
  });

  it("omits organization_id when not provided", () => {
    const token = issueAccessToken({
      sub: "user-1",
      aud: "eight",
      scope: "openid email profile",
    });

    const parsed = verifyAccessToken(token);
    expect(parsed?.organizationId).toBeUndefined();
  });
});
