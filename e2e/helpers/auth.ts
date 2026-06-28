import type { Page } from "@playwright/test";

export function e2ePatientCredentials(): { email: string; password: string } | null {
  const email =
    process.env.E2E_PATIENT_EMAIL?.trim() ||
    (process.env.CI ? "e2e-patient@doctor8.test" : undefined);
  const password =
    process.env.E2E_PATIENT_PASSWORD?.trim() ||
    (process.env.CI ? "TestPassword1!" : undefined);
  if (!email || !password) return null;
  return { email, password };
}

export function e2eProfessionalCredentials(): { email: string; password: string } | null {
  const email = process.env.E2E_PROFESSIONAL_EMAIL?.trim();
  const password = process.env.E2E_PROFESSIONAL_PASSWORD?.trim();
  if (!email || !password) return null;
  return { email, password };
}

export async function loginWithCredentials(
  page: Page,
  email: string,
  password: string,
  callbackUrl?: string,
): Promise<void> {
  const loginPath = callbackUrl
    ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/login";
  await page.goto(loginPath);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator("form button[type='submit']").click();
}

export async function waitForAuthenticatedSession(page: Page): Promise<void> {
  await page.waitForFunction(async () => {
    const res = await fetch("/api/auth/session");
    const data = await res.json();
    return Boolean(data?.user?.email);
  });
}
