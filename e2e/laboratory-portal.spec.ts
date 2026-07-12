import { test, expect } from "@playwright/test";
import { e2ePatientCredentials } from "./helpers/auth";

test.describe("laboratorios B2B hub", () => {
  test("/laboratorios/login renderiza formulario credentials sem Google", async ({ page }) => {
    const res = await page.goto("/laboratorios/login");
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /google/i })).toHaveCount(0);
  });

  test("deslogado /laboratorios/painel redireciona para /laboratorios/login", async ({ page }) => {
    await page.goto("/laboratorios/painel");
    await expect(page).toHaveURL(/\/laboratorios\/login/);
  });
});

test.describe("laboratorios login role rejection", () => {
  test.beforeEach(() => {
    test.skip(!e2ePatientCredentials(), "Set E2E_PATIENT_EMAIL and E2E_PATIENT_PASSWORD");
  });

  test("paciente em /laboratorios/login nao e redirecionado silenciosamente", async ({ page }) => {
    const creds = e2ePatientCredentials()!;
    await page.goto("/laboratorios/login");
    await page.locator('input[type="email"]').fill(creds.email);
    await page.locator('input[type="password"]').fill(creds.password);
    await page.locator("form button[type='submit']").click();
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/laboratorios\/login/);
    expect(page.url()).not.toMatch(/\/patient/);
  });
});
