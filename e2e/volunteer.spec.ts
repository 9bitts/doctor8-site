import { test, expect } from "@playwright/test";
import {
  e2eProfessionalCredentials,
  loginWithCredentials,
  waitForAuthenticatedSession,
  apiGet,
} from "./helpers/auth";

test.describe("volunteer access", () => {
  test("volunteer dashboard redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/humanitarian/volunteer");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("authenticated volunteer", () => {
  test.beforeEach(() => {
    test.skip(!e2eProfessionalCredentials(), "Set E2E_PROFESSIONAL_EMAIL and E2E_PROFESSIONAL_PASSWORD");
  });

  test("verified professional can open volunteer dashboard", async ({ page }) => {
    const creds = e2eProfessionalCredentials()!;
    await loginWithCredentials(page, creds.email, creds.password, "/humanitarian/volunteer");
    await waitForAuthenticatedSession(page, creds.email);
    await page.waitForURL(/\/humanitarian\/volunteer/, { timeout: 30_000 });
    await expect(page.locator("body")).toBeVisible();
  });

  test("volunteer API responds when logged in", async ({ page }) => {
    const creds = e2eProfessionalCredentials()!;
    await loginWithCredentials(page, creds.email, creds.password);
    await waitForAuthenticatedSession(page, creds.email);
    const res = await apiGet(
      page,
      "/api/humanitarian/volunteer?campaignSlug=venezuela-terremoto-2026&lang=es",
    );
    expect(res.ok).toBeTruthy();
    const body = (await res.json()) as { campaign?: unknown };
    expect(body.campaign).toBeTruthy();
  });
});
