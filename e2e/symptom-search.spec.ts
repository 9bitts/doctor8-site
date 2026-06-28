import { test, expect } from "@playwright/test";

test.describe("symptom search API", () => {
  test("matches Portuguese symptom", async ({ request }) => {
    const res = await request.get("/api/public/symptom-search?q=ansiedade&lang=pt");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.match?.specialtySlug).toBe("psiquiatra");
  });

  test("matches English symptom", async ({ request }) => {
    const res = await request.get("/api/public/symptom-search?q=headache&lang=en");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.match?.specialtySlug).toBe("neurologista");
  });

  test("matches Spanish symptom", async ({ request }) => {
    const res = await request.get("/api/public/symptom-search?q=ansiedad&lang=es");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.match?.specialtySlug).toBe("psiquiatra");
  });

  test("returns null for short query", async ({ request }) => {
    const res = await request.get("/api/public/symptom-search?q=ab&lang=pt");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.match).toBeNull();
  });
});
