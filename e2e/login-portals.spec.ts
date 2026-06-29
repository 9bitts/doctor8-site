import { test, expect } from "@playwright/test";
import {
  LOGIN_PORTALS,
  PROTECTED_AREA_REDIRECTS,
  PSYCHOLOGIST_LOGIN,
  PATIENT_LOGIN,
  DOCTOR_LOGIN,
  e2ePsychologistCredentials,
  expectLoginForm,
  loginPsychologist,
  waitForAuthenticatedSession,
} from "./helpers/auth";

test.describe("login portals", () => {
  for (const portal of LOGIN_PORTALS) {
    test(`${portal.path} renders email/password form`, async ({ page }) => {
      await page.goto(portal.path);
      await expect(page).toHaveURL(new RegExp(`${portal.path.replace("/", "\\/")}`));
      await expectLoginForm(page);
      await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
    });
  }

  for (const { area, loginPath } of PROTECTED_AREA_REDIRECTS) {
    test(`unauthenticated ${area} redirects to ${loginPath}`, async ({ page }) => {
      await page.goto(area);
      await expect(page).toHaveURL(new RegExp(`${loginPath.replace("/", "\\/")}`));
      await expectLoginForm(page);
    });
  }

  test("patient login lists doctor portal link", async ({ page }) => {
    await page.goto(PATIENT_LOGIN);
    await expect(page.getByRole("link", { name: /médico|doctor/i })).toBeVisible();
  });

  test("doctor login lists professional portal links", async ({ page }) => {
    await page.goto(DOCTOR_LOGIN);
    await expect(page.getByRole("link", { name: /psychologist|psicologo/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /psychoanalyst|psicanalista/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /integrative|integrativ/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /cnpj|clinic|organiza/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /angel|anjo/i })).toBeVisible();
  });

  test("forgot password from psychologist portal preserves login context", async ({ page }) => {
    await page.goto(PSYCHOLOGIST_LOGIN);
    await page.locator('a[href*="forgot-password"]').click();
    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(page).toHaveURL(/from=%2Flogin%2Fpsicologo|from=.*psicologo/);
    await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
  });

  test("forgot password method page opens from email step", async ({ page }) => {
    await page.goto("/forgot-password?from=/login/organizacao");
    await page.locator('input[type="email"]').fill("test@example.com");
    await page.locator("form button[type='submit']").click();
    await expect(page).toHaveURL(/\/forgot-password\/method/);
    await expect(page).toHaveURL(/email=test(%40|@)example\.com/i);
    await expect(page).toHaveURL(/from=%2Flogin%2Forganizacao|from=.*organizacao/);
  });

  test("legacy /login redirects to patient login", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login\/paciente/);
  });
});

test.describe("authenticated portal login", () => {
  test.beforeEach(() => {
    test.skip(!e2ePsychologistCredentials(), "Set E2E_PSYCHOLOGIST_EMAIL and E2E_PSYCHOLOGIST_PASSWORD");
  });

  test("psychologist can log in via dedicated portal", async ({ page }) => {
    const creds = e2ePsychologistCredentials()!;
    await loginPsychologist(page, creds.email, creds.password);
    await waitForAuthenticatedSession(page);
    await page.waitForURL(/\/(psychologist|onboarding)/, { timeout: 30_000 });
    await expect(page.locator("body")).toBeVisible();
  });
});
