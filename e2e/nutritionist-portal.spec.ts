import { test, expect } from "@playwright/test";
import {
  e2eNutritionistCredentials,
  e2eProfessionalCredentials,
  e2eAdminCredentials,
  loginNutritionist,
  loginProfessional,
  waitForAuthenticatedSession,
  verifyEmailAsAdmin,
  apiGet,
  LOGIN,
} from "./helpers/auth";

const SIGNUP_URL = "/register/professional/signup";
const TEST_PASSWORD = "TestPassword1!";

test.describe("nutritionist portal", () => {
  test("legacy /login/nutricionista redirects to unified login with nutritionist portal", async ({ page }) => {
    await page.goto("/login/nutricionista");
    await expect(page).toHaveURL(/\/login\?.*portal=nutritionist/);
  });

  test("PROFESSIONAL with general specialty cannot access /nutricionista", async ({ page }) => {
    const creds = e2eProfessionalCredentials();
    test.skip(!creds, "Set E2E_PROFESSIONAL_EMAIL and E2E_PROFESSIONAL_PASSWORD");

    await loginProfessional(page, creds!.email, creds!.password);
    await waitForAuthenticatedSession(page, creds!.email);

    await page.goto("/nutricionista");
    await expect(page).toHaveURL(/\/professional/);
  });

  test.describe("authenticated nutritionist", () => {
    test.beforeEach(() => {
      test.skip(!e2eNutritionistCredentials(), "Set E2E_NUTRITIONIST_EMAIL and E2E_NUTRITIONIST_PASSWORD");
    });

    test("login lands on /nutricionista dashboard", async ({ page }) => {
      const creds = e2eNutritionistCredentials()!;
      await loginNutritionist(page, creds.email, creds.password);
      await waitForAuthenticatedSession(page, creds.email);
      await page.waitForURL(/\/nutricionista/, { timeout: 30_000 });
      expect(page.url()).toMatch(/\/nutricionista/);
    });

    test("session includes Nutritionist specialty for role home", async ({ page }) => {
      const creds = e2eNutritionistCredentials()!;
      await loginNutritionist(page, creds.email, creds.password);
      await waitForAuthenticatedSession(page, creds.email);

      const session = (await apiGet(page, "/api/auth/session").then((r) => r.json())) as {
        user?: { role?: string; professionalSpecialty?: string };
      };
      expect(session?.user?.role).toBe("PROFESSIONAL");
      expect(session?.user?.professionalSpecialty).toBe("Nutritionist");
    });

    test("nutrition modules load with patient selection", async ({ page }) => {
      const creds = e2eNutritionistCredentials()!;
      await loginNutritionist(page, creds.email, creds.password);
      await waitForAuthenticatedSession(page, creds.email);
      await page.waitForURL(/\/nutricionista/, { timeout: 30_000 });

      for (const modulePath of [
        "/nutricionista/anamnese",
        "/nutricionista/antropometria",
        "/nutricionista/planos",
        "/nutricionista/diario",
      ]) {
        await page.goto(modulePath);
        await expect(page).toHaveURL(new RegExp(modulePath.replace("/", "\\/")));
        await expect(page.getByText(/paciente|patient/i).first()).toBeVisible({ timeout: 15_000 });
      }
    });
  });

  test("signup via nutritionist portal lands on /nutricionista after verification", async ({ page, request }) => {
    test.skip(!e2eAdminCredentials(), "Admin credentials required to verify new signup email");

    const unique = `e2e-nutri-${Date.now()}@doctor8.test`;
    await page.goto(`${SIGNUP_URL}?portal=nutritionist&profession=nutricionista&lang=pt`);

    await page.locator('input[type="email"]').fill(unique);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('input[placeholder*="Nome"], input').first().fill("E2E");
    const nameInputs = page.locator('input[type="text"]');
    await nameInputs.nth(0).fill("E2E");
    await nameInputs.nth(1).fill("NutriSignup");

    const phoneInput = page.locator('input[inputmode="numeric"], input[type="tel"]').first();
    await phoneInput.fill("11999999999");

    const checkboxes = page.locator('label[class*="cursor-pointer"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).click();
    }

    const registerResPromise = page.waitForResponse(
      (res) => res.url().includes("/api/auth/register") && res.request().method() === "POST",
    );
    await page.locator("form button[type='submit']").click();
    const registerRes = await registerResPromise;
    expect(registerRes.ok()).toBeTruthy();
    const body = (await registerRes.json()) as { userId?: string };
    expect(body.userId).toBeTruthy();

    await verifyEmailAsAdmin(page, body.userId!);

    await page.context().clearCookies();
    await page.goto(LOGIN);
    await page.locator('input[type="email"]').fill(unique);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator("form button[type='submit']").click();
    await waitForAuthenticatedSession(page, unique);
    await page.waitForURL(/\/nutricionista/, { timeout: 45_000 });
    expect(page.url()).toMatch(/\/nutricionista/);
  });

  test("regression: nutritionist then back then generic professional lands on /professional", async ({ page }) => {
    test.skip(!e2eAdminCredentials(), "Admin credentials required to verify new signup email");

    const unique = `e2e-pro-reg-${Date.now()}@doctor8.test`;
    await page.goto(`${SIGNUP_URL}?lang=pt`);

    await page.getByRole("button", { name: /nutricionista/i }).click();
    await page.getByRole("button", { name: /voltar|back/i }).click();
    await page.getByRole("button", { name: /profissional de saúde|healthcare professional/i }).click();

    await page.locator('input[type="email"]').fill(unique);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    const nameInputs = page.locator('input[type="text"]');
    await nameInputs.nth(0).fill("E2E");
    await nameInputs.nth(1).fill("ProSignup");
    const phoneInput = page.locator('input[inputmode="numeric"], input[type="tel"]').first();
    await phoneInput.fill("11988887777");

    const checkboxes = page.locator('label[class*="cursor-pointer"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).click();
    }

    const registerResPromise = page.waitForResponse(
      (res) => res.url().includes("/api/auth/register") && res.request().method() === "POST",
    );
    await page.locator("form button[type='submit']").click();
    const registerRes = await registerResPromise;
    const body = (await registerRes.json()) as { userId?: string };
    expect(body.userId).toBeTruthy();

    await verifyEmailAsAdmin(page, body.userId!);

    await page.context().clearCookies();
    await page.goto(LOGIN);
    await page.locator('input[type="email"]').fill(unique);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator("form button[type='submit']").click();
    await waitForAuthenticatedSession(page, unique);
    await page.waitForURL(/\/(professional|onboarding)/, { timeout: 45_000 });
    expect(page.url()).not.toMatch(/\/nutricionista/);
  });
});
