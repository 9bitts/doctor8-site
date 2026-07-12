import { test, expect } from "@playwright/test";
import { e2ePatientCredentials } from "./helpers/auth";

test.describe("farmacias B2B hub", () => {
  test("/farmacias/login renderiza formulario credentials", async ({ page }) => {
    const res = await page.goto("/farmacias/login");
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /google/i })).toHaveCount(0);
  });

  test("deslogado /farmacias/painel redireciona para /farmacias/login", async ({ page }) => {
    await page.goto("/farmacias/painel");
    await expect(page).toHaveURL(/\/farmacias\/login/);
  });

  test("deslogado /farmacias/validar/token redireciona para login", async ({ page }) => {
    await page.goto("/farmacias/validar/test-token-abc");
    await expect(page).toHaveURL(/\/farmacias\/login/);
  });
});

test.describe("farmacias login role rejection", () => {
  test.beforeEach(() => {
    test.skip(!e2ePatientCredentials(), "Set E2E_PATIENT_EMAIL and E2E_PATIENT_PASSWORD");
  });

  test("paciente em /farmacias/login nao e redirecionado silenciosamente", async ({ page }) => {
    const creds = e2ePatientCredentials()!;
    await page.goto("/farmacias/login");
    await page.locator('input[type="email"]').fill(creds.email);
    await page.locator('input[type="password"]').fill(creds.password);
    await page.locator("form button[type='submit']").click();
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/farmacias\/login/);
    expect(page.url()).not.toMatch(/\/patient/);
  });
});

test.describe("farmacias public search", () => {
  test("/farmacias/buscar renderiza busca publica", async ({ page }) => {
    const res = await page.goto("/farmacias/buscar");
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });
});
