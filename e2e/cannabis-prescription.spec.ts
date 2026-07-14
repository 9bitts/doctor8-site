import { test, expect } from "@playwright/test";

/**
 * E2E: cannabis prescription flow (requires E2E doctor credentials + seeded catalog).
 * Set E2E_DOCTOR_EMAIL / E2E_DOCTOR_PASSWORD and run seed:cannabis against E2E DB.
 */
test.describe("cannabis prescription", () => {
  const doctorEmail = process.env.E2E_DOCTOR_EMAIL;
  const doctorPassword = process.env.E2E_DOCTOR_PASSWORD;

  test.beforeEach(() => {
    test.skip(!doctorEmail || !doctorPassword, "Set E2E_DOCTOR_EMAIL and E2E_DOCTOR_PASSWORD");
  });

  test("doctor searches cbd 200 and API returns cannabis items", async ({ request }) => {
    test.skip(true, "Enable when E2E doctor session helper is wired for professional portal");
    const res = await request.get(
      "/api/professional/medicina-natural/search?q=cbd%20200&categoria=CANNABIS",
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.items?.length).toBeGreaterThan(0);
  });
});
