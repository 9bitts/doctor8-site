/** Allowed S3 upload folder prefixes ? prevents arbitrary key namespaces. */
const FIXED_FOLDERS = new Set(["uploads", "resources", "patient-docs", "nutrition-diary"]);

const RECORDS_FOLDER = /^records\/[a-zA-Z0-9_-]+$/;
const LICENSE_DOCS_FOLDER = /^license-docs\/[a-zA-Z0-9_-]+$/;
// Patient uploads are scoped to the caller: patient-docs/<userId>
const PATIENT_DOCS_SCOPED = /^patient-docs\/[a-zA-Z0-9_-]+$/;
const NUTRITION_DIARY_SCOPED = /^nutrition-diary\/[a-zA-Z0-9_-]+$/;

export function normalizeUploadFolder(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_/-]/g, "").replace(/^\/+|\/+$/g, "");
}

export function isAllowedUploadFolder(folder: string): boolean {
  const normalized = normalizeUploadFolder(folder);
  if (!normalized) return false;
  if (FIXED_FOLDERS.has(normalized)) return true;
  if (RECORDS_FOLDER.test(normalized)) return true;
  if (PATIENT_DOCS_SCOPED.test(normalized)) return true;
  if (NUTRITION_DIARY_SCOPED.test(normalized)) return true;
  return LICENSE_DOCS_FOLDER.test(normalized);
}

export function nutritionDiaryFolder(userId: string): string {
  return `nutrition-diary/${userId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/** Prefix a patient's own uploads with their userId so keys are ownership-verifiable. */
export function patientDocsFolder(userId: string): string {
  return `patient-docs/${userId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}
