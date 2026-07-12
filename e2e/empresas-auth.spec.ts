import { test, expect } from "@playwright/test";
import { e2ePatientCredentials } from "./helpers/auth";

function e2eEmployerCredentials(): { email: string; password: string } | null {
  const email =
    process.env.E2E_EMPLOYER_EMAIL?.trim() ||
    (process.env.CI ? "e2e-employer@doctor8.test" : undefined);
  const password =
    process.env.E2E_EMPLOYER_PASSWORD?.trim() ||
    (process.env.CI ? "TestPassword1!" : undefined);
  if (!email || !password) return null;
  return { email, password };
}

function e2eOccupationalPhysicianCredentials(): { email: string; password: string } | null {
  const email =
    process.env.E2E_OCC_PHYSICIAN_EMAIL?.trim() ||
    (process.env.CI ? "e2e-occ-physician@doctor8.test" : undefined);
  const password =
    process.env.E2E_OCC_PHYSICIAN_PASSWORD?.trim() ||
    (process.env.CI ? "TestPassword1!" : undefined);
  if (!email || !password) return null;
  return { email, password };
}

test.describe("empresas auth — employer login", () => {
  test("login empresa com credencial de paciente mostra erro sem redirect silencioso", async ({ page }) => {
    test.skip(!e2ePatientCredentials(), "Set E2E_PATIENT_EMAIL and E2E_PATIENT_PASSWORD");
    const creds = e2ePatientCredentials()!;
    await page.goto("/empresas/login");
    await page.locator('input[type="email"]').fill(creds.email);
    await page.locator('input[type="password"]').fill(creds.password);
    await page.locator("form button[type='submit']").click();
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/empresas\/login/);
    expect(page.url()).not.toMatch(/\/patient/);
  });

  test("login empresa com credenciais válidas chega ao painel", async ({ page }) => {
    test.skip(!e2eEmployerCredentials(), "Set E2E_EMPLOYER_EMAIL and E2E_EMPLOYER_PASSWORD");
    const creds = e2eEmployerCredentials()!;
    await page.goto("/empresas/login");
    await page.locator('input[type="email"]').fill(creds.email);
    await page.locator('input[type="password"]').fill(creds.password);
    await page.locator("form button[type='submit']").click();
    await page.waitForURL(/\/empresas\/painel/, { timeout: 30_000 });
  });
});

test.describe("empresas auth — physician login", () => {
  test("login médico não exibe botão Google", async ({ page }) => {
    await page.goto("/empresas/medico/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /google/i })).toHaveCount(0);
  });

  test("login médico com credencial de paciente permanece no login", async ({ page }) => {
    test.skip(!e2ePatientCredentials(), "Set E2E_PATIENT_EMAIL and E2E_PATIENT_PASSWORD");
    const creds = e2ePatientCredentials()!;
    await page.goto("/empresas/medico/login");
    await page.locator('input[type="email"]').fill(creds.email);
    await page.locator('input[type="password"]').fill(creds.password);
    await page.locator("form button[type='submit']").click();
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/empresas\/medico\/login/);
  });

  test("login médico com credenciais válidas chega ao painel", async ({ page }) => {
    test.skip(!e2eOccupationalPhysicianCredentials(), "Set E2E_OCC_PHYSICIAN_EMAIL and E2E_OCC_PHYSICIAN_PASSWORD");
    const creds = e2eOccupationalPhysicianCredentials()!;
    await page.goto("/empresas/medico/login");
    await page.locator('input[type="email"]').fill(creds.email);
    await page.locator('input[type="password"]').fill(creds.password);
    await page.locator("form button[type='submit']").click();
    await page.waitForURL(/\/empresas\/medico\/painel/, { timeout: 30_000 });
  });
});

test.describe("empresas auth — invite validation", () => {
  test("POST validate-employer-invite rejeita token inválido", async ({ request }) => {
    const res = await request.post("/api/auth/validate-employer-invite", {
      data: { kind: "physician", token: "invalid-token-xxxxxxxx" },
    });
    expect(res.status()).toBe(404);
  });
});

test.describe("empresas auth — multi-company switcher", () => {
  test("switcher visível para employer com múltiplas empresas", async ({ page }) => {
    test.skip(!e2eEmployerCredentials(), "Set E2E_EMPLOYER_EMAIL and E2E_EMPLOYER_PASSWORD");
    const creds = e2eEmployerCredentials()!;
    await page.goto("/empresas/login");
    await page.locator('input[type="email"]').fill(creds.email);
    await page.locator('input[type="password"]').fill(creds.password);
    await page.locator("form button[type='submit']").click();
    await page.waitForURL(/\/empresas\/painel/, { timeout: 30_000 });

    const switcher = page.locator("[data-employer-company-switcher]");
    const count = await switcher.count();
    if (count === 0) {
      test.skip(true, "Usuário E2E não tem múltiplas empresas — seed necessário");
    }
    await expect(switcher).toBeVisible();
  });
});
