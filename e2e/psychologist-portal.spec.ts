import { test, expect } from "@playwright/test";
import {
  e2ePsychologistCredentials,
  loginPsychologist,
  waitForAuthenticatedSession,
  apiGet,
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
    await page.waitForURL(/\/(psychologist|professional|onboarding)/, { timeout: 30_000 });
    expect(page.url()).toMatch(/\/(psychologist|professional|onboarding)/);
  });

  test("volunteer API exposes only psicologo pool for psychologist", async ({ page }) => {
    const creds = e2ePsychologistCredentials()!;
    await loginPsychologist(page, creds.email, creds.password);
    await waitForAuthenticatedSession(page);

    const res = await apiGet(
      page,
      `/api/humanitarian/volunteer?campaignSlug=${VENEZUELA_SLUG}&lang=pt`,
    );
    expect(res.ok).toBeTruthy();
    const body = (await res.json()) as { pools?: { slug: string }[] };
    const slugs = (body.pools || []).map((p) => p.slug);
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

    const session = (await apiGet(page, "/api/auth/session").then((r) => r.json())) as {
      user?: { role?: string; professionalSpecialty?: string };
    };
    expect(session?.user?.role).toBe("PROFESSIONAL");
    expect(session?.user?.professionalSpecialty).toBe("Psychologist");
  });
});
