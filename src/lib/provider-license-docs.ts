export const PROVIDER_ROLES = ["PROFESSIONAL", "PSYCHOANALYST", "INTEGRATIVE_THERAPIST", "ANGEL"] as const;

export type ProviderRole = (typeof PROVIDER_ROLES)[number];

export const LICENSE_DOC_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;

/** Max documents per provider (reasonable cap; each file up to 50 MB). */
export const MAX_LICENSE_DOCUMENTS = 20;

export const MAX_LICENSE_DOC_BYTES = 50 * 1024 * 1024;

export function isProviderRole(role: string): role is ProviderRole {
  return (PROVIDER_ROLES as readonly string[]).includes(role);
}

export function licenseDocsFolder(userId: string): string {
  return `license-docs/${userId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}
