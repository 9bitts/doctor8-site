export const VITAL8_ERP_URL = "https://vital8erp.com/";

export const VITAL8_B2B_ROLES = [
  "ORGANIZATION",
  "EMPLOYER",
  "PHARMACY_STORE",
  "LABORATORY",
] as const;

export type Vital8B2BRole = (typeof VITAL8_B2B_ROLES)[number];

export function isVital8B2BRole(role: string): role is Vital8B2BRole {
  return (VITAL8_B2B_ROLES as readonly string[]).includes(role);
}
