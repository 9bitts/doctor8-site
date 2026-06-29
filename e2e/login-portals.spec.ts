import { test, expect } from "@playwright/test";
import {
  LOGIN,
  LEGACY_LOGIN_PATHS,
  PROTECTED_AREA_REDIRECTS,
  e2ePsychologistCredentials,
  expectLoginForm,
  loginPsychologist,
  waitForAuthenticatedSession,
} from "./helpers/auth";

test.describe("unified login", () => {
  test("/login renders email/password + Google", async ({ page }) => {
    await page.goto(LOGIN);
    await expect(page).toHaveURL(/\/login/);
    await expectLoginForm(page);
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
  });

  for (const legacy of LEGACY_LOGIN_PATHS) {
    test(`legacy ${legacy} redirects to /login`, async ({ page }) => {
      await page.goto(legacy);
      await expect(page).toHaveURL(/\/login(\?|$)/);
      await expectLoginForm(page);
    });
  }

  test("legacy login preserves callbackUrl on redirect", async ({ page }) => {
    await page.goto("/login/medico?callbackUrl=%2Fprofessional");
    await expect(page).toHaveURL(/\/login\?.*callbackUrl=%2Fprofessional/);
  });

  for (const { area } of PROTECTED_AREA_REDIRECTS) {
    test(`unauthenticated ${area} redirects to /login`, async ({ page }) => {
      await page.goto(area);
      await expect(page).toHaveURL(/\/login/);
      await expectLoginForm(page);
    });
  }

  test("login offers professional and volunteer signup links", async ({ page }) => {
    await page.goto(LOGIN);
    await expect(page.getByRole("link", { name: /profession|profissional|profesional/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /volunte|voluntár|voluntar/i })).toBeVisible();
  });

  test("forgot password from login preserves login context", async ({ page }) => {
    await page.goto(LOGIN);
    await page.locator('a[href*="forgot-password"]').click();
    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(page).toHaveURL(/from=%2Flogin/);
    await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
  });

  test("forgot password method page opens from email step", async ({ page }) => {
    await page.goto("/forgot-password?from=/login");
    await page.locator('input[type="email"]').fill("test@example.com");
    await page.locator("form button[type='submit']").click();
    await expect(page).toHaveURL(/\/forgot-password\/method/);
    await expect(page).toHaveURL(/email=test(%40|@)example\.com/i);
  });
});

test.describe("authenticated login", () => {
  test.beforeEach(() => {
    test.skip(!e2ePsychologistCredentials(), "Set E2E_PSYCHOLOGIST_EMAIL and E2E_PSYCHOLOGIST_PASSWORD");
  });

  test("psychologist can log in via unified login", async ({ page }) => {
    const creds = e2ePsychologistCredentials()!;
    await loginPsychologist(page, creds.email, creds.password);
    await waitForAuthenticatedSession(page);
    await page.waitForURL(/\/(psychologist|professional|onboarding)/, { timeout: 30_000 });
    await expect(page.locator("body")).toBeVisible();
  });
});
