export const PROVIDER_ROLES = ["PROFESSIONAL", "PSYCHOANALYST", "INTEGRATIVE_THERAPIST", "ANGEL"] as const;

export type ProviderRole = (typeof PROVIDER_ROLES)[number];

export const LICENSE_DOC_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

const EXT_TO_MIME: Record<string, (typeof LICENSE_DOC_MIME)[number]> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

/** Resolve MIME from browser type or file extension (mobile uploads often omit type). */
export function resolveLicenseDocMime(file: Pick<File, "name" | "type">): string | null {
  const type = file.type?.trim().toLowerCase();
  if (type && (LICENSE_DOC_MIME as readonly string[]).includes(type)) {
    return type;
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  const inferred = EXT_TO_MIME[ext];
  return inferred ?? null;
}

export type LicenseDocValidationError = "INVALID_CERTIFICATE_TYPE" | "CERTIFICATE_TOO_LARGE";

export function validateLicenseDocFile(
  file: Pick<File, "name" | "type" | "size">,
): { ok: true; mimeType: string } | { ok: false; error: LicenseDocValidationError } {
  if (file.size > MAX_LICENSE_DOC_BYTES) {
    return { ok: false, error: "CERTIFICATE_TOO_LARGE" };
  }
  const mimeType = resolveLicenseDocMime(file);
  if (!mimeType) {
    return { ok: false, error: "INVALID_CERTIFICATE_TYPE" };
  }
  return { ok: true, mimeType };
}

/** Max documents per provider (reasonable cap; each file up to 50 MB). */
export const MAX_LICENSE_DOCUMENTS = 20;

export const MAX_LICENSE_DOC_BYTES = 50 * 1024 * 1024;

export function isProviderRole(role: string): role is ProviderRole {
  return (PROVIDER_ROLES as readonly string[]).includes(role);
}

export function licenseDocsFolder(userId: string): string {
  return `license-docs/${userId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}
