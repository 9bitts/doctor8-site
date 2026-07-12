import { test, expect } from "@playwright/test";
import {
  e2eDentistCredentials,
  e2eProfessionalCredentials,
  e2eAdminCredentials,
  loginDentist,
  loginProfessional,
  waitForAuthenticatedSession,
  verifyEmailAsAdmin,
  apiGet,
  apiPost,
  LOGIN,
} from "./helpers/auth";

const SIGNUP_URL = "/register/professional/signup";
const TEST_PASSWORD = "TestPassword1!";

test.describe("dentist portal", () => {
  test("legacy /login/odontologo redirects to unified login with dentist portal", async ({ page }) => {
    await page.goto("/login/odontologo");
    await expect(page).toHaveURL(/\/login\?.*portal=dentist/);
  });

  test("PROFESSIONAL with general specialty cannot access /odontologo", async ({ page }) => {
    const creds = e2eProfessionalCredentials();
    test.skip(!creds, "Set E2E_PROFESSIONAL_EMAIL and E2E_PROFESSIONAL_PASSWORD");

    await loginProfessional(page, creds!.email, creds!.password);
    await waitForAuthenticatedSession(page, creds!.email);

    await page.goto("/odontologo");
    await expect(page).toHaveURL(/\/professional/);
  });

  test.describe("authenticated dentist", () => {
    test.beforeEach(() => {
      test.skip(!e2eDentistCredentials(), "Set E2E_DENTIST_EMAIL and E2E_DENTIST_PASSWORD");
    });

    test("login lands on /odontologo dashboard", async ({ page }) => {
      const creds = e2eDentistCredentials()!;
      await loginDentist(page, creds.email, creds.password);
      await waitForAuthenticatedSession(page, creds.email);
      await page.waitForURL(/\/odontologo/, { timeout: 30_000 });
      expect(page.url()).toMatch(/\/odontologo/);
    });

    test("session includes Dentist (General) specialty for role home", async ({ page }) => {
      const creds = e2eDentistCredentials()!;
      await loginDentist(page, creds.email, creds.password);
      await waitForAuthenticatedSession(page, creds.email);

      const session = (await apiGet(page, "/api/auth/session").then((r) => r.json())) as {
        user?: { role?: string; professionalSpecialty?: string };
      };
      expect(session?.user?.role).toBe("PROFESSIONAL");
      expect(session?.user?.professionalSpecialty).toBe("Dentist (General)");
    });

    test("odontogram: select patient, save tooth, persists after reload", async ({ page }) => {
      const creds = e2eDentistCredentials()!;
      await loginDentist(page, creds.email, creds.password);
      await waitForAuthenticatedSession(page, creds.email);
      await page.waitForURL(/\/odontologo/, { timeout: 30_000 });

      await page.goto("/odontologo/odontograma");
      await expect(page.getByText(/paciente|patient/i).first()).toBeVisible({ timeout: 15_000 });

      const patientButton = page.getByRole("button", { name: /E2E\s+DentistPatient/i });
      await expect(patientButton).toBeVisible({ timeout: 15_000 });
      await patientButton.click();

      const tooth11 = page.getByRole("button", { name: "11", exact: true });
      await expect(tooth11).toBeVisible({ timeout: 15_000 });
      await tooth11.click();

      const conditionSelect = page.locator("select").first();
      await conditionSelect.selectOption("CARIES");
      await page.getByRole("button", { name: /aplicar|apply/i }).click();

      const saveResPromise = page.waitForResponse(
        (res) =>
          res.url().includes("/odontogram") &&
          res.request().method() === "PUT" &&
          res.status() === 200,
      );
      await page.getByRole("button", { name: /salvar|save/i }).click();
      await saveResPromise;

      await page.reload();
      await expect(patientButton).toBeVisible({ timeout: 15_000 });
      await patientButton.click();
      await expect(tooth11).toBeVisible({ timeout: 15_000 });

      const recordsRes = await apiGet(page, "/api/professional/records");
      const recordsBody = (await recordsRes.json()) as {
        records?: { id: string; firstName: string; lastName: string }[];
      };
      const chart = recordsBody.records?.find(
        (r) => r.firstName === "E2E" && r.lastName === "DentistPatient",
      );
      expect(chart?.id).toBeTruthy();

      const odontoRes = await apiGet(page, `/api/professional/records/${chart!.id}/odontogram`);
      expect(odontoRes.ok).toBeTruthy();
      const odontoBody = (await odontoRes.json()) as {
        teeth?: Record<string, { condition?: string }>;
      };
      expect(odontoBody.teeth?.["11"]?.condition).toBe("CARIES");
    });

    test("POST photos rejects storageKey from another chart (403)", async ({ page }) => {
      const creds = e2eDentistCredentials()!;
      await loginDentist(page, creds.email, creds.password);
      await waitForAuthenticatedSession(page, creds.email);

      const recordsRes = await apiGet(page, "/api/professional/records");
      const recordsBody = (await recordsRes.json()) as { records?: { id: string }[] };
      const chartId = recordsBody.records?.[0]?.id;
      test.skip(!chartId, "No patient chart for dentist E2E user");

      const foreignKey = "records/other-patient-chart-id/fake-photo.jpg";
      const postRes = await apiPost(page, `/api/dentist/charts/${chartId}/photos`, {
        storageKey: foreignKey,
        category: "INTRAORAL",
      });
      expect(postRes.status).toBe(403);
    });
  });

  test("signup via dentist portal lands on /odontologo after verification", async ({ page }) => {
    test.skip(!e2eAdminCredentials(), "Admin credentials required to verify new signup email");

    const unique = `e2e-dent-${Date.now()}@doctor8.test`;
    await page.goto(`${SIGNUP_URL}?portal=dentist&profession=dentista&lang=pt`);

    await page.locator('input[type="email"]').fill(unique);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    const nameInputs = page.locator('input[type="text"]');
    await nameInputs.nth(0).fill("E2E");
    await nameInputs.nth(1).fill("DentSignup");

    const phoneInput = page.locator('input[inputmode="numeric"], input[type="tel"]').first();
    await phoneInput.fill("11977776666");

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
    await page.waitForURL(/\/odontologo/, { timeout: 45_000 });
    expect(page.url()).toMatch(/\/odontologo/);
  });

  test("regression: dentist then back then generic professional lands on /professional", async ({ page }) => {
    test.skip(!e2eAdminCredentials(), "Admin credentials required to verify new signup email");

    const unique = `e2e-dent-reg-${Date.now()}@doctor8.test`;
    await page.goto(`${SIGNUP_URL}?lang=pt`);

    await page.getByRole("button", { name: /dentista/i }).click();
    await page.getByRole("button", { name: /voltar|back/i }).click();
    await page.getByRole("button", { name: /profissional de saúde|healthcare professional/i }).click();

    await page.locator('input[type="email"]').fill(unique);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    const nameInputs = page.locator('input[type="text"]');
    await nameInputs.nth(0).fill("E2E");
    await nameInputs.nth(1).fill("ProSignup");
    const phoneInput = page.locator('input[inputmode="numeric"], input[type="tel"]').first();
    await phoneInput.fill("11966665555");

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
    expect(page.url()).not.toMatch(/\/odontologo/);
  });
});
