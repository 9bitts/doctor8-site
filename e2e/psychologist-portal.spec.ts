import { test, expect } from "@playwright/test";
import {
  e2ePsychologistCredentials,
  loginPsychologist,
  waitForAuthenticatedSession,
} from "./helpers/auth";

const VENEZUELA_SLUG = "venezuela-terremoto-2026";

test.describe("psychologist portal", () => {
  test.beforeEach(() => {
    test.skip(
      !e2ePsychologistCredentials(),
      "Set E2E_PSYCHOLOGIST_EMAIL and E2E_PSYCHOLOGIST_PASSWORD (or run in CI)",
    );
  });

  test("psicologo login lands on /psychologist dashboard", async ({ page }) => {
    const creds = e2ePsychologistCredentials()!;
    await loginPsychologist(page, creds.email, creds.password);
    await waitForAuthenticatedSession(page);
    await page.waitForURL(/\/psychologist(?:\/)?$/);
    expect(page.url()).toContain("/psychologist");
  });

  test("volunteer API exposes only psicologo pool for psychologist", async ({ page }) => {
    const creds = e2ePsychologistCredentials()!;
    await loginPsychologist(page, creds.email, creds.password);
    await waitForAuthenticatedSession(page);

    const res = await page.request.get(
      `/api/humanitarian/volunteer?campaignSlug=${VENEZUELA_SLUG}&lang=pt`,
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const slugs = (body.pools || []).map((p: { slug: string }) => p.slug);
    expect(slugs).toEqual(["psicologo"]);
  });

  test("patients list uses psychologist portal paths", async ({ page }) => {
    const creds = e2ePsychologistCredentials()!;
    await loginPsychologist(page, creds.email, creds.password);
    await waitForAuthenticatedSession(page);

    await page.goto("/psychologist/patients");
    await expect(page).toHaveURL(/\/psychologist\/patients/);

    const patientLink = page.locator('a[href^="/psychologist/patients/"]').first();
    await expect(patientLink).toBeVisible({ timeout: 10_000 });
    await patientLink.click();
    await expect(page).toHaveURL(/\/psychologist\/patients\/[^/]+$/);
  });

  test("session includes psychology specialty for role home", async ({ page }) => {
    const creds = e2ePsychologistCredentials()!;
    await loginPsychologist(page, creds.email, creds.password);
    await waitForAuthenticatedSession(page);

    const session = await page.request.get("/api/auth/session").then((r) => r.json());
    expect(session?.user?.role).toBe("PROFESSIONAL");
    expect(session?.user?.professionalSpecialty).toBe("Psychologist");
  });
});
