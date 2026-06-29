import { test, expect } from "@playwright/test";
import {
  e2ePatientCredentials,
  loginWithCredentials,
  waitForAuthenticatedSession,
} from "./helpers/auth";

const VENEZUELA_SLUG = "venezuela-terremoto-2026";

test.describe("authentication", () => {
  test("patient dashboard redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/patient");
    await expect(page).toHaveURL(/\/login\/paciente/);
  });

  test("video API returns 401 without session", async ({ request }) => {
    const res = await request.get("/api/appointments/nonexistent-id/video");
    expect(res.status()).toBe(401);
  });

  test("humanitarian video API returns 401 without session", async ({ request }) => {
    const res = await request.get("/api/humanitarian/queue/nonexistent-id/video");
    expect(res.status()).toBe(401);
  });

  test("humanitarian queue API returns 401 without session", async ({ request }) => {
    const res = await request.get(
      `/api/humanitarian/queue?campaignSlug=${VENEZUELA_SLUG}`,
    );
    expect(res.status()).toBe(401);
  });

  test("humanitarian intake API returns 401 without session", async ({ request }) => {
    const res = await request.get(
      `/api/humanitarian/intake?campaignSlug=${VENEZUELA_SLUG}`,
    );
    expect(res.status()).toBe(401);
  });

  test("jit queue API returns 401 without session", async ({ request }) => {
    const res = await request.get("/api/jit/queue?sessionId=nonexistent");
    expect(res.status()).toBe(401);
  });

  test("volunteer API returns 401 without session", async ({ request }) => {
    const res = await request.get(
      `/api/humanitarian/volunteer?campaignSlug=${VENEZUELA_SLUG}`,
    );
    expect(res.status()).toBe(401);
  });

  test("patient FHIR export API returns 401 without session", async ({ request }) => {
    const res = await request.get("/api/patient/history/fhir");
    expect(res.status()).toBe(401);
  });
});

test.describe("authenticated patient", () => {
  test.beforeEach(() => {
    test.skip(!e2ePatientCredentials(), "Set E2E_PATIENT_EMAIL and E2E_PATIENT_PASSWORD");
  });

  test("patient can log in and reach dashboard", async ({ page }) => {
    const creds = e2ePatientCredentials()!;
    await loginWithCredentials(page, creds.email, creds.password);
    await waitForAuthenticatedSession(page);
    await page.waitForURL(/\/(patient|humanitarian)/, { timeout: 30_000 });
    await expect(page.locator("body")).toBeVisible();
  });

  test("patient can open humanitarian triage when logged in", async ({ page }) => {
    const creds = e2ePatientCredentials()!;
    const triagePath = `/humanitarian/${VENEZUELA_SLUG}/triage`;
    await loginWithCredentials(page, creds.email, creds.password, triagePath);
    await waitForAuthenticatedSession(page);
    await page.waitForURL(new RegExp(`/humanitarian/${VENEZUELA_SLUG}/triage`), {
      timeout: 30_000,
    });
    await expect(page.locator("body")).toBeVisible();
  });

  test("patient can open humanitarian care page when logged in", async ({ page }) => {
    const creds = e2ePatientCredentials()!;
    const carePath = `/humanitarian/${VENEZUELA_SLUG}`;
    await loginWithCredentials(page, creds.email, creds.password, carePath);
    await waitForAuthenticatedSession(page);
    await page.waitForURL(new RegExp(`/humanitarian/${VENEZUELA_SLUG}`), {
      timeout: 30_000,
    });
    await expect(page.locator("body")).toBeVisible();
  });

  test("patient can open humanitarian TCLE page when logged in", async ({ page }) => {
    const creds = e2ePatientCredentials()!;
    const tclePath = `/humanitarian/${VENEZUELA_SLUG}/tcle`;
    await loginWithCredentials(page, creds.email, creds.password, tclePath);
    await waitForAuthenticatedSession(page);
    await page.waitForURL(new RegExp(`/humanitarian/${VENEZUELA_SLUG}/tcle`), {
      timeout: 30_000,
    });
    await expect(page.locator("body")).toBeVisible();
  });

  test("patient can open humanitarian anamnese page when logged in", async ({ page }) => {
    const creds = e2ePatientCredentials()!;
    const anamnesePath = `/humanitarian/${VENEZUELA_SLUG}/anamnese`;
    await loginWithCredentials(page, creds.email, creds.password, anamnesePath);
    await waitForAuthenticatedSession(page);
    await page.waitForURL(new RegExp(`/humanitarian/${VENEZUELA_SLUG}/anamnese`), {
      timeout: 30_000,
    });
    await expect(page.locator("body")).toBeVisible();
  });

  test("humanitarian intake API responds for logged-in patient", async ({ page }) => {
    const creds = e2ePatientCredentials()!;
    await loginWithCredentials(page, creds.email, creds.password);
    await waitForAuthenticatedSession(page);
    const res = await page.request.get(
      `/api/humanitarian/intake?campaignSlug=${VENEZUELA_SLUG}`,
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.intake?.campaignId).toBeTruthy();
  });

  test("patient can export FHIR bundle when logged in", async ({ page }) => {
    const creds = e2ePatientCredentials()!;
    await loginWithCredentials(page, creds.email, creds.password);
    await waitForAuthenticatedSession(page);
    const res = await page.request.get("/api/patient/history/fhir");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.resourceType).toBe("Bundle");
    const types = (body.entry || []).map((e: { resource?: { resourceType?: string } }) => e.resource?.resourceType);
    expect(types).toContain("Patient");
    expect(types.some((t: string) => t === "Encounter" || t === "ServiceRequest" || t === "MedicationRequest")).toBeTruthy();
  });

  test("legacy /settings redirects patient to account page", async ({ page }) => {
    const creds = e2ePatientCredentials()!;
    await loginWithCredentials(page, creds.email, creds.password);
    await waitForAuthenticatedSession(page);
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/patient\/account/, { timeout: 15_000 });
  });
});
