import { test, expect } from "@playwright/test";
import {
  e2ePatientCredentials,
  loginWithCredentials,
  waitForAuthenticatedSession,
} from "./helpers/auth";

const VENEZUELA_SLUG = "venezuela-terremoto-2026";

test.describe("authentication", () => {
  test("patient dashboard redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/patient");
    await expect(page).toHaveURL(/\/login/);
  });

  test("video API returns 401 without session", async ({ request }) => {
    const res = await request.get("/api/appointments/nonexistent-id/video");
    expect(res.status()).toBe(401);
  });

  test("humanitarian video API returns 401 without session", async ({ request }) => {
    const res = await request.get("/api/humanitarian/queue/nonexistent-id/video");
    expect(res.status()).toBe(401);
  });
});

test.describe("authenticated patient", () => {
  test.beforeEach(() => {
    test.skip(!e2ePatientCredentials(), "Set E2E_PATIENT_EMAIL and E2E_PATIENT_PASSWORD");
  });

  test("patient can log in and reach dashboard", async ({ page }) => {
    const creds = e2ePatientCredentials()!;
    await loginWithCredentials(page, creds.email, creds.password);
    await waitForAuthenticatedSession(page);
    await page.waitForURL(/\/(patient|humanitarian)/, { timeout: 30_000 });
    await expect(page.locator("body")).toBeVisible();
  });

  test("patient can open humanitarian triage when logged in", async ({ page }) => {
    const creds = e2ePatientCredentials()!;
    const triagePath = `/humanitarian/${VENEZUELA_SLUG}/triage`;
    await loginWithCredentials(page, creds.email, creds.password, triagePath);
    await waitForAuthenticatedSession(page);
    await page.waitForURL(new RegExp(`/humanitarian/${VENEZUELA_SLUG}/triage`), {
      timeout: 30_000,
    });
    await expect(page.locator("body")).toBeVisible();
  });

  test("patient can open humanitarian care page when logged in", async ({ page }) => {
    const creds = e2ePatientCredentials()!;
    const carePath = `/humanitarian/${VENEZUELA_SLUG}`;
    await loginWithCredentials(page, creds.email, creds.password, carePath);
    await waitForAuthenticatedSession(page);
    await page.waitForURL(new RegExp(`/humanitarian/${VENEZUELA_SLUG}`), {
      timeout: 30_000,
    });
    await expect(page.locator("body")).toBeVisible();
  });
});
