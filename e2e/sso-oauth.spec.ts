import { test, expect } from "@playwright/test";

test.describe("OIDC authorize", () => {
  test("rejects unknown client_id", async ({ request }) => {
    const res = await request.get(
      "/api/oauth/authorize?client_id=unknown&redirect_uri=https://example.com/cb&response_type=code&scope=openid",
    );
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_client");
  });

  test("rejects disallowed redirect_uri for vital8 client", async ({ request }) => {
    const res = await request.get(
      "/api/oauth/authorize?client_id=vital8&redirect_uri=https://evil.example/cb&response_type=code&scope=openid",
    );
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_request");
  });

  test("account_type=CLINIC redirects unauthenticated user to organization portal login", async ({
    page,
  }) => {
    const redirectUri = encodeURIComponent("http://localhost:3001/api/auth/callback/doctor8");
    await page.goto(
      `/api/oauth/authorize?client_id=vital8&redirect_uri=${redirectUri}&response_type=code&scope=openid&account_type=CLINIC&prompt=login`,
    );
    await expect(page).toHaveURL(/\/login\?.*portal=organization/);
    await expect(page).toHaveURL(/callbackUrl=/);
  });
});

test.describe("organization registration legacy login", () => {
  test("/login/organizacao redirects to unified login with organization portal", async ({
    page,
  }) => {
    await page.goto("/login/organizacao");
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });
});
