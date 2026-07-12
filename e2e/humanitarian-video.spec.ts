import { test, expect } from "@playwright/test";
import {
  e2ePatientCredentials,
  loginWithCredentials,
  waitForAuthenticatedSession,
  apiGet,
} from "./helpers/auth";

const VENEZUELA_SLUG = "venezuela-terremoto-2026";

test.describe("humanitarian video flow", () => {
  test.beforeEach(() => {
    test.skip(!e2ePatientCredentials(), "Set E2E_PATIENT_EMAIL and E2E_PATIENT_PASSWORD");
  });

  test("called patient can fetch video session from API", async ({ page }) => {
    const creds = e2ePatientCredentials()!;
    await loginWithCredentials(page, creds.email, creds.password);
    await waitForAuthenticatedSession(page);

    const queueRes = await apiGet(page, `/api/humanitarian/queue?campaignSlug=${VENEZUELA_SLUG}`);
    expect(queueRes.ok).toBeTruthy();
    const queue = (await queueRes.json()) as { entry?: { id?: string; status?: string } };
    const entryId = queue.entry?.id;
    expect(entryId).toBeTruthy();
    expect(queue.entry?.status).toBe("CALLED");

    const videoRes = await apiGet(page, `/api/humanitarian/queue/${entryId}/video`);
    expect(videoRes.ok).toBeTruthy();
    const video = (await videoRes.json()) as { url?: string; token?: string; kind?: string };
    expect(video.url).toContain("daily.co");
    expect(video.token).toBeTruthy();
    expect(video.kind).toBe("humanitarian");
  });

  test("called patient can open humanitarian video page", async ({ page }) => {
    const creds = e2ePatientCredentials()!;
    await loginWithCredentials(page, creds.email, creds.password);
    await waitForAuthenticatedSession(page);

    const queueRes = await apiGet(page, `/api/humanitarian/queue?campaignSlug=${VENEZUELA_SLUG}`);
    const queue = (await queueRes.json()) as { entry?: { id?: string } };
    const entryId = queue.entry?.id;
    expect(entryId).toBeTruthy();

    await page.goto(`/video/humanitarian/${entryId}`);
    await expect(page.locator("body")).toBeVisible({ timeout: 30_000 });
  });
});
