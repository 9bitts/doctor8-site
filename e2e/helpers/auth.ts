import type { Page } from "@playwright/test";

// Login is unified into a single /login screen. All former per-role portal
// constants now point to /login so existing specs keep compiling.
export const LOGIN = "/login";
export const PATIENT_LOGIN = LOGIN;
export const DOCTOR_LOGIN = LOGIN;
/** @deprecated Use LOGIN */
export const MAIN_LOGIN = LOGIN;
export const PSYCHOLOGIST_LOGIN = LOGIN;
export const PSYCHOANALYST_LOGIN = LOGIN;
export const INTEGRATIVE_THERAPIST_LOGIN = LOGIN;
export const ORGANIZATION_LOGIN = LOGIN;
export const ANGEL_LOGIN = LOGIN;

export const LOGIN_PORTALS = [
  { path: LOGIN, dashboardPattern: /\/(patient|humanitarian|professional|psychologist|psychoanalyst|integrative-therapist|organization|admin)/ },
] as const;

// Legacy per-role login URLs that must redirect to the unified login.
export const LEGACY_LOGIN_PATHS = [
  "/login/paciente",
  "/login/medico",
  "/login/psicologo",
  "/login/psicanalista",
  "/login/terapeuta-integrativo",
  "/login/organizacao",
  "/login/anjo",
] as const;

export const PROTECTED_AREA_REDIRECTS = [
  { area: "/psychoanalyst", loginPath: LOGIN },
  { area: "/integrative-therapist", loginPath: LOGIN },
  { area: "/organization", loginPath: LOGIN },
  { area: "/humanitarian/angel", loginPath: LOGIN },
  { area: "/psychologist", loginPath: LOGIN },
  { area: "/professional", loginPath: LOGIN },
  { area: "/patient", loginPath: LOGIN },
] as const;

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

export function e2eQueuePatientCredentials(): { email: string; password: string } | null {
  const email =
    process.env.E2E_QUEUE_PATIENT_EMAIL?.trim() ||
    (process.env.CI ? "e2e-queue-patient@doctor8.test" : undefined);
  const password =
    process.env.E2E_QUEUE_PATIENT_PASSWORD?.trim() ||
    (process.env.CI ? "TestPassword1!" : undefined);
  if (!email || !password) return null;
  return { email, password };
}

export function e2eProfessionalCredentials(): { email: string; password: string } | null {
  const email =
    process.env.E2E_PROFESSIONAL_EMAIL?.trim() ||
    (process.env.CI ? "e2e-volunteer@doctor8.test" : undefined);
  const password =
    process.env.E2E_PROFESSIONAL_PASSWORD?.trim() ||
    (process.env.CI ? "TestPassword1!" : undefined);
  if (!email || !password) return null;
  return { email, password };
}

export function e2ePsychologistCredentials(): { email: string; password: string } | null {
  const email =
    process.env.E2E_PSYCHOLOGIST_EMAIL?.trim() ||
    (process.env.CI ? "e2e-psychologist@doctor8.test" : undefined);
  const password =
    process.env.E2E_PSYCHOLOGIST_PASSWORD?.trim() ||
    (process.env.CI ? "TestPassword1!" : undefined);
  if (!email || !password) return null;
  return { email, password };
}

export function e2eAdminCredentials(): { email: string; password: string } | null {
  const email =
    process.env.E2E_ADMIN_EMAIL?.trim() ||
    (process.env.CI ? "e2e-admin@doctor8.test" : undefined);
  const password =
    process.env.E2E_ADMIN_PASSWORD?.trim() ||
    (process.env.CI ? "TestPassword1!" : undefined);
  if (!email || !password) return null;
  return { email, password };
}

export async function expectLoginForm(page: Page): Promise<void> {
  await page.locator('input[type="email"]').waitFor({ state: "visible" });
  await page.locator('input[type="password"]').waitFor({ state: "visible" });
  await page.locator("form button[type='submit']").waitFor({ state: "visible" });
}

export async function loginAtPortal(
  page: Page,
  portalPath: string,
  email: string,
  password: string,
  callbackUrl?: string,
): Promise<void> {
  const loginPath = callbackUrl
    ? `${portalPath}?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : portalPath;
  await page.goto(loginPath);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator("form button[type='submit']").click();
}

export async function loginWithCredentials(
  page: Page,
  email: string,
  password: string,
  callbackUrl?: string,
): Promise<void> {
  await loginAtPortal(page, PATIENT_LOGIN, email, password, callbackUrl);
}

export async function loginDoctor(
  page: Page,
  email: string,
  password: string,
  callbackUrl?: string,
): Promise<void> {
  await loginAtPortal(page, DOCTOR_LOGIN, email, password, callbackUrl);
}

export async function loginPsychologist(
  page: Page,
  email: string,
  password: string,
  callbackUrl?: string,
): Promise<void> {
  await loginAtPortal(page, PSYCHOLOGIST_LOGIN, email, password, callbackUrl);
}

export async function waitForAuthenticatedSession(page: Page): Promise<void> {
  await page.waitForFunction(async () => {
    const res = await fetch("/api/auth/session");
    const data = await res.json();
    return Boolean(data?.user?.email);
  });
}
