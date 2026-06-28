import { test, expect } from "@playwright/test";
import {
  e2eAdminCredentials,
  e2ePatientCredentials,
  loginWithCredentials,
  waitForAuthenticatedSession,
} from "./helpers/auth";

test.describe("payments API", () => {
  test("create-intent returns 401 without session", async ({ request }) => {
    const res = await request.post("/api/payments/create-intent", {
      data: {
        professionalId: "nonexistent",
        scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
        type: "TELECONSULT",
        paymentMethod: "card",
      },
    });
    expect(res.status()).toBe(401);
  });

  test("push subscribe returns 401 without session", async ({ request }) => {
    const res = await request.post("/api/push/subscribe", {
      data: {
        endpoint: "https://example.com/push/abc",
        keys: { p256dh: "test", auth: "test" },
      },
    });
    expect(res.status()).toBe(401);
  });

  test("vapid public key endpoint responds", async ({ request }) => {
    const res = await request.get("/api/push/vapid-public-key");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(typeof body.enabled).toBe("boolean");
  });

  test("subscription checkout returns 401 without session", async ({ request }) => {
    const res = await request.post("/api/payments/subscription", {
      data: { plan: "club" },
    });
    expect(res.status()).toBe(401);
  });

  test("admin payments API returns 403 for patient", async ({ page }) => {
    test.skip(!e2ePatientCredentials(), "Set E2E_PATIENT_EMAIL and E2E_PATIENT_PASSWORD");
    const creds = e2ePatientCredentials()!;
    await loginWithCredentials(page, creds.email, creds.password);
    await waitForAuthenticatedSession(page);

    const res = await page.request.get("/api/admin/payments");
    expect(res.status()).toBe(403);
  });
});

test.describe("admin integrations", () => {
  test("integrations API returns 403 without admin session", async ({ request }) => {
    const res = await request.get("/api/admin/integrations");
    expect(res.status()).toBe(403);
  });

  test("integrations API returns 403 for patient", async ({ page }) => {
    test.skip(!e2ePatientCredentials(), "Set E2E_PATIENT_EMAIL and E2E_PATIENT_PASSWORD");
    const creds = e2ePatientCredentials()!;
    await loginWithCredentials(page, creds.email, creds.password);
    await waitForAuthenticatedSession(page);

    const res = await page.request.get("/api/admin/integrations");
    expect(res.status()).toBe(403);
  });

  test.describe("authenticated admin", () => {
    test.beforeEach(() => {
      test.skip(!e2eAdminCredentials(), "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD");
    });

    test("admin can open integrations page", async ({ page }) => {
      const creds = e2eAdminCredentials()!;
      await loginWithCredentials(page, creds.email, creds.password, "/admin/integrations");
      await waitForAuthenticatedSession(page);
      await page.waitForURL(/\/admin\/integrations/, { timeout: 30_000 });
      await expect(page.locator("body")).toBeVisible();
    });

    test("admin integrations API returns rows", async ({ page }) => {
      const creds = e2eAdminCredentials()!;
      await loginWithCredentials(page, creds.email, creds.password);
      await waitForAuthenticatedSession(page);

      const res = await page.request.get("/api/admin/integrations");
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.integrations?.length).toBeGreaterThan(5);
      expect(body.checkedAt).toBeTruthy();
    });
  });
});
