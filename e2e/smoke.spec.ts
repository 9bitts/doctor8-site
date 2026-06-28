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

  test("verify-email page loads without crash", async ({ page }) => {
    const res = await page.goto("/verify-email?email=test%40doctor8.test");
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator("body")).toContainText("Verifique seu e-mail");
    await expect(page.locator("body")).not.toContainText("Algo deu errado");
    await expect(page.locator("body")).not.toContainText("verifica??o");
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
    expect(body).not.toMatch(/publicit\?ria|Endere\?o|N\?o\.|: \u00e0 o |: \u00e0 a |como est\?o|verifica\?\?o/);
    await expect(page.locator("body")).toContainText("Pol\u00edtica de Privacidade");
  });

  test("privacy page title has no encoding glitches", async ({ page }) => {
    await page.goto("/privacy");
    const title = await page.title();
    expect(title).not.toMatch(/\?/);
  });

  test("terms page body has no corrupted encoding", async ({ page }) => {
    await page.goto("/terms");
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/USU\?RIO|Pol\?tica|servi\?os|: \u00e0 o |: \u00e0 a |como est\?o|verifica\?\?o/);
    await expect(page.locator("body")).toContainText("Termos de Uso");
    await expect(page.locator("body")).toContainText("Acordo do Usu\u00e1rio");
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
    expect(body).toContain("doctor8-hum-v4");
  });

  test("PWA icons are served", async ({ request }) => {
    const res = await request.get("/icons/icon-192.png");
    expect(res.ok()).toBeTruthy();
  });

  test("patient exam requests page responds", async ({ page }) => {
    const res = await page.goto("/patient/exam-requests");
    expect(res?.status()).toBeLessThan(500);
  });

  test("patient resources page responds", async ({ page }) => {
    const res = await page.goto("/patient/resources");
    expect(res?.status()).toBeLessThan(500);
  });

  test("SMART configuration is public", async ({ request }) => {
    const res = await request.get("/.well-known/smart-configuration");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.authorization_endpoint).toContain("smart/authorize");
    expect(body.capabilities).toContain("launch-standalone");
  });

  test("FHIR metadata is public", async ({ request }) => {
    const res = await request.get("/fhir/metadata");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.resourceType).toBe("CapabilityStatement");
  });

  test("admin integrations page responds", async ({ page }) => {
    const res = await page.goto("/admin/integrations");
    expect(res?.status()).toBeLessThan(500);
  });

  test("admin home hub responds", async ({ page }) => {
    const res = await page.goto("/admin");
    expect(res?.status()).toBeLessThan(500);
  });
});
