import { test, expect } from "@playwright/test";
import {
  e2ePatientCredentials,
  loginWithCredentials,
  waitForAuthenticatedSession,
} from "./helpers/auth";

test.describe("clinical emissions API", () => {
  test.beforeEach(() => {
    test.skip(!e2ePatientCredentials(), "Set E2E_PATIENT_EMAIL and E2E_PATIENT_PASSWORD");
  });

  test("patient sees seeded prescriptions", async ({ page }) => {
    const creds = e2ePatientCredentials()!;
    await loginWithCredentials(page, creds.email, creds.password);
    await waitForAuthenticatedSession(page);

    const res = await page.request.get("/api/patient/prescriptions");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.prescriptions?.length).toBeGreaterThan(0);
    expect(body.prescriptions[0].medications?.length).toBeGreaterThan(0);
  });

  test("patient sees seeded exam requests", async ({ page }) => {
    const creds = e2ePatientCredentials()!;
    await loginWithCredentials(page, creds.email, creds.password);
    await waitForAuthenticatedSession(page);

    const res = await page.request.get("/api/patient/exam-requests");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.examRequests?.length).toBeGreaterThan(0);
    expect(body.examRequests[0].examItems?.length).toBeGreaterThan(0);
  });

  test("patient clinical pages load when authenticated", async ({ page }) => {
    const creds = e2ePatientCredentials()!;
    await loginWithCredentials(page, creds.email, creds.password, "/patient/prescriptions");
    await waitForAuthenticatedSession(page);
    await page.waitForURL(/\/patient\/prescriptions/, { timeout: 30_000 });
    await expect(page.locator("body")).toBeVisible();

    await page.goto("/patient/exam-requests");
    await expect(page.locator("body")).toBeVisible();
  });
});
