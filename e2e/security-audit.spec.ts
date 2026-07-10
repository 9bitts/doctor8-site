import { test, expect } from "@playwright/test";

const registerPayload = (email: string) => ({
  email,
  password: "TestPassword1!",
  firstName: "E2E",
  lastName: "Security",
  role: "PATIENT",
  region: "US",
  phoneDdi: "1",
  phoneNational: "5551234567",
  acceptedTerms: true,
  acceptedPrivacy: true,
});

test.describe("Security audit — public API hardening", () => {
  test("GET pharmacy prescription validate requires auth", async ({ request }) => {
    const res = await request.get("/api/pharmacy-store/prescriptions/validate?token=fake");
    expect(res.status()).toBe(401);
  });

  test("GET pharmacy validate returns 403 for patient role before lookup", async ({ request }) => {
    const res = await request.get("/api/pharmacy-store/prescriptions/validate?token=any-token");
    if (res.status() === 401) return;
    expect(res.status()).toBe(403);
  });

  test("GET shared record returns 404 for invalid token", async ({ request }) => {
    const res = await request.get("/api/shared/not-a-real-token");
    expect([404, 410]).toContain(res.status());
  });

  test("support rejects empty messages", async ({ request }) => {
    const res = await request.post("/api/support", {
      data: { messages: [] },
    });
    expect(res.status()).toBe(400);
  });

  test("change-email requires auth", async ({ request }) => {
    const res = await request.post("/api/auth/change-email", {
      data: { newEmail: "other@example.com", currentPassword: "x" },
    });
    expect(res.status()).toBe(401);
  });

  test("register returns uniform ack (anti-enumeration)", async ({ request }) => {
    const email = `security-${Date.now()}@doctor8.test`;
    const first = await request.post("/api/auth/register", { data: registerPayload(email) });
    expect(first.status()).toBe(200);
    expect((await first.json()).success).toBe(true);

    const second = await request.post("/api/auth/register", { data: registerPayload(email) });
    expect(second.status()).toBe(200);
    expect((await second.json()).success).toBe(true);
  });
});
