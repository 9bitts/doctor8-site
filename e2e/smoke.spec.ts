import { test, expect } from "@playwright/test";

test.describe("public smoke", () => {
  test("home page responds", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("SOS Venezuela landing loads", async ({ page }) => {
    const res = await page.goto("/sos-venezuela");
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("PWA manifest is served", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.name).toContain("Doctor8");
  });

  test("service worker is served", async ({ request }) => {
    const res = await request.get("/sw.js");
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toContain("doctor8-hum-v1");
  });

  test("PWA icons are served", async ({ request }) => {
    const res = await request.get("/icons/icon-192.svg");
    expect(res.ok()).toBeTruthy();
  });
});
