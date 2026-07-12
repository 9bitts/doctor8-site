import { test, expect } from "@playwright/test";
import { e2ePatientCredentials } from "./helpers/auth";

test.describe("empresas B2B hub", () => {
  test("/empresas renderiza hub com os 3 logins", async ({ page }) => {
    await page.goto("/empresas");
    await expect(page.getByRole("link", { name: /entrar como empresa/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /entrar como médico/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /entrar como psicólogo/i })).toBeVisible();
    await expect(page.locator('a[href="/empresas/login"]').first()).toBeVisible();
    await expect(page.locator('a[href="/empresas/medico/login"]').first()).toBeVisible();
    await expect(page.locator('a[href="/empresas/psicologo/login"]').first()).toBeVisible();
  });
});

test.describe("empresas login guards", () => {
  test("deslogado /empresas/painel redireciona para /empresas/login", async ({ page }) => {
    await page.goto("/empresas/painel");
    await expect(page).toHaveURL(/\/empresas\/login/);
  });

  test("deslogado /empresas/medico/painel redireciona para /empresas/medico/login", async ({ page }) => {
    await page.goto("/empresas/medico/painel");
    await expect(page).toHaveURL(/\/empresas\/medico\/login/);
  });

  test("/empresas/medico/login renderiza formulario", async ({ page }) => {
    const res = await page.goto("/empresas/medico/login");
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("/empresas/login renderiza formulario", async ({ page }) => {
    const res = await page.goto("/empresas/login");
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});

test.describe("empresas login role rejection", () => {
  test.beforeEach(() => {
    test.skip(!e2ePatientCredentials(), "Set E2E_PATIENT_EMAIL and E2E_PATIENT_PASSWORD");
  });

  test("login empresa com credencial de paciente mostra erro sem redirect silencioso", async ({ page }) => {
    const creds = e2ePatientCredentials()!;
    await page.goto("/empresas/login");
    await page.locator('input[type="email"]').fill(creds.email);
    await page.locator('input[type="password"]').fill(creds.password);
    await page.locator("form button[type='submit']").click();
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/empresas\/login/);
    expect(page.url()).not.toMatch(/\/patient/);
  });
});
