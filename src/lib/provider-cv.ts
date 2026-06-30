export const CV_MIME = "application/pdf" as const;

export const MAX_CV_BYTES = 50 * 1024 * 1024;

export function cvFolder(userId: string): string {
  return `cv/${userId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}
