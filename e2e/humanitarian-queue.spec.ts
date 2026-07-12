import { test, expect } from "@playwright/test";
import {
  e2eQueuePatientCredentials,
  e2eProfessionalCredentials,
  loginWithCredentials,
  waitForAuthenticatedSession,
  apiGet,
  apiPost,
} from "./helpers/auth";

const VENEZUELA_SLUG = "venezuela-terremoto-2026";

test.describe.serial("humanitarian queue flow", () => {
  test.beforeEach(() => {
    test.skip(
      !e2eQueuePatientCredentials(),
      "Set E2E_QUEUE_PATIENT_EMAIL and E2E_QUEUE_PATIENT_PASSWORD",
    );
  });

  test("queue patient intake is ready to join", async ({ page }) => {
    const creds = e2eQueuePatientCredentials()!;
    await loginWithCredentials(page, creds.email, creds.password);
    await waitForAuthenticatedSession(page, creds.email);

    const res = await apiGet(page, `/api/humanitarian/intake?campaignSlug=${VENEZUELA_SLUG}`);
    expect(res.ok).toBeTruthy();
    const body = (await res.json()) as {
      intake?: {
        triageValid?: boolean;
        tcleAccepted?: boolean;
        phoneReady?: boolean;
        computedPriority?: string;
      };
    };
    expect(body.intake?.triageValid).toBe(true);
    expect(body.intake?.tcleAccepted).toBe(true);
    expect(body.intake?.phoneReady).toBe(true);
    expect(body.intake?.computedPriority).toBe("ROUTINE");
  });

  test("patient can join queue and receive WAITING status", async ({ page }) => {
    const creds = e2eQueuePatientCredentials()!;
    await loginWithCredentials(page, creds.email, creds.password);
    await waitForAuthenticatedSession(page, creds.email);

    const initialRes = await apiGet(page, `/api/humanitarian/queue?campaignSlug=${VENEZUELA_SLUG}`);
    expect(initialRes.ok).toBeTruthy();
    const initial = (await initialRes.json()) as { entry?: { id?: string; status?: string } };

    let entryId = initial.entry?.id;
    let status = initial.entry?.status;

    if (!entryId) {
      const joinRes = await apiPost(page, "/api/humanitarian/queue", {
        campaignSlug: VENEZUELA_SLUG,
        poolSlug: "medico",
        chiefComplaint: "E2E queue join test",
        lang: "es",
      });
      expect(joinRes.ok).toBeTruthy();
      const joined = (await joinRes.json()) as { entry?: { id?: string; status?: string } };
      entryId = joined.entry?.id;
      status = joined.entry?.status;
    }

    expect(entryId).toBeTruthy();
    expect(status).toBe("WAITING");

    const statusRes = await apiGet(page, `/api/humanitarian/queue?campaignSlug=${VENEZUELA_SLUG}`);
    expect(statusRes.ok).toBeTruthy();
    const latest = (await statusRes.json()) as { entry?: { status?: string; id?: string } };
    expect(latest.entry?.status).toBe("WAITING");
    expect(latest.entry?.id).toBe(entryId);
  });

  test("volunteer API shows waiting patients in medico pool", async ({ page }) => {
    test.skip(!e2eProfessionalCredentials(), "Set E2E professional credentials");

    const proCreds = e2eProfessionalCredentials()!;
    await loginWithCredentials(page, proCreds.email, proCreds.password);
    await waitForAuthenticatedSession(page, proCreds.email);

    const volRes = await apiGet(
      page,
      `/api/humanitarian/volunteer?campaignSlug=${VENEZUELA_SLUG}&lang=es`,
    );
    expect(volRes.ok).toBeTruthy();
    const vol = (await volRes.json()) as { pools?: { slug: string; waiting?: number }[] };
    const medicoPool = vol.pools?.find((p) => p.slug === "medico");
    expect(medicoPool?.waiting).toBeGreaterThanOrEqual(1);
  });

  test("volunteer going online calls waiting patient", async ({ page }) => {
    test.skip(!e2eProfessionalCredentials(), "Set E2E professional credentials");

    const proCreds = e2eProfessionalCredentials()!;
    await loginWithCredentials(page, proCreds.email, proCreds.password);
    await waitForAuthenticatedSession(page, proCreds.email);

    const onlineRes = await apiPost(page, "/api/humanitarian/volunteer?lang=es", {
      status: "ONLINE",
      campaignSlug: VENEZUELA_SLUG,
      poolSlug: "medico",
    });
    expect(onlineRes.ok).toBeTruthy();
    const online = (await onlineRes.json()) as { status?: string };
    expect(online.status).toBe("ONLINE");
  });

  test("called queue patient can fetch humanitarian video session", async ({ page }) => {
    const patientCreds = e2eQueuePatientCredentials()!;
    await loginWithCredentials(page, patientCreds.email, patientCreds.password);
    await waitForAuthenticatedSession(page, creds.email);

    let entryId: string | undefined;
    let status: string | undefined;

    for (let i = 0; i < 30; i++) {
      const res = await apiGet(page, `/api/humanitarian/queue?campaignSlug=${VENEZUELA_SLUG}`);
      const body = (await res.json()) as { entry?: { id?: string; status?: string } };
      entryId = body.entry?.id;
      status = body.entry?.status;
      if (status === "CALLED") break;
      await page.waitForTimeout(1000);
    }

    expect(entryId).toBeTruthy();
    expect(status).toBe("CALLED");

    const videoRes = await apiGet(page, `/api/humanitarian/queue/${entryId}/video`);
    expect(videoRes.ok).toBeTruthy();
    const video = (await videoRes.json()) as { url?: string; token?: string; kind?: string };
    expect(video.url).toContain("daily.co");
    expect(video.token).toBeTruthy();
    expect(video.kind).toBe("humanitarian");
  });
});
