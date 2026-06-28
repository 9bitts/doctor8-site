import { test, expect } from "@playwright/test";
import {
  e2eQueuePatientCredentials,
  loginWithCredentials,
  waitForAuthenticatedSession,
} from "./helpers/auth";

const VENEZUELA_SLUG = "venezuela-terremoto-2026";

test.describe("humanitarian queue join", () => {
  test.beforeEach(() => {
    test.skip(
      !e2eQueuePatientCredentials(),
      "Set E2E_QUEUE_PATIENT_EMAIL and E2E_QUEUE_PATIENT_PASSWORD",
    );
  });

  test("patient can join queue and receive WAITING status", async ({ page }) => {
    const creds = e2eQueuePatientCredentials()!;
    await loginWithCredentials(page, creds.email, creds.password);
    await waitForAuthenticatedSession(page);

    const initialRes = await page.request.get(
      `/api/humanitarian/queue?campaignSlug=${VENEZUELA_SLUG}`,
    );
    expect(initialRes.ok()).toBeTruthy();
    const initial = await initialRes.json();
    expect(initial.entry).toBeNull();

    const joinRes = await page.request.post("/api/humanitarian/queue", {
      data: {
        campaignSlug: VENEZUELA_SLUG,
        poolSlug: "medico",
        chiefComplaint: "E2E queue join test",
        lang: "es",
      },
    });
    expect(joinRes.ok()).toBeTruthy();
    const joined = await joinRes.json();
    expect(joined.entry?.status).toBe("WAITING");
    expect(joined.entry?.id).toBeTruthy();

    const statusRes = await page.request.get(
      `/api/humanitarian/queue?campaignSlug=${VENEZUELA_SLUG}`,
    );
    expect(statusRes.ok()).toBeTruthy();
    const status = await statusRes.json();
    expect(status.entry?.status).toBe("WAITING");
    expect(status.entry?.id).toBe(joined.entry.id);
  });
});
