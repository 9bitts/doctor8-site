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

  test("humanitarian landing metadata has no encoding glitches", async ({ page }) => {
    await page.goto("/humanitarian/venezuela-terremoto-2026");
    const title = await page.title();
    expect(title).not.toMatch(/\?/);
  });

  test("terms page has no encoding glitches in title", async ({ page }) => {
    await page.goto("/terms");
    const title = await page.title();
    expect(title).not.toMatch(/\?/);
    await expect(page.locator("body")).toContainText("Termos de Uso");
  });

  test("privacy page body has no corrupted encoding", async ({ page }) => {
    await page.goto("/privacy");
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/publicit\?ria|Endere\?o|N\?o\./);
    expect(body).toMatch(/Pol?tica de Privacidade|Privacidade/i);
  });

  test("privacy page title has no encoding glitches", async ({ page }) => {
    await page.goto("/privacy");
    const title = await page.title();
    expect(title).not.toMatch(/\?/);
  });

  test("terms page body has no corrupted encoding", async ({ page }) => {
    await page.goto("/terms");
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/USU\?RIO|Pol\?tica|servi\?os/);
    expect(body).toMatch(/Termos de Uso|Usu?rio/i);
  });

  test("PWA manifest is served", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.name).toContain("Doctor8");
    expect(json.name).not.toContain("?");
    expect(json.icons?.some((i: { src: string }) => i.src.includes("icon-192.png"))).toBeTruthy();
  });

  test("service worker is served", async ({ request }) => {
    const res = await request.get("/sw.js");
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toContain("doctor8-hum-v2");
  });

  test("PWA icons are served", async ({ request }) => {
    const res = await request.get("/icons/icon-192.png");
    expect(res.ok()).toBeTruthy();
  });
});
