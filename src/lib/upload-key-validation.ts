import { nutritionDiaryFolder, patientDocsFolder } from "@/lib/upload-folders";

/** S3 prefix for clinical record attachments scoped to a patient chart. */
export function recordsFolder(chartId: string): string {
  return `records/${chartId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

function hasTraversal(key: string): boolean {
  return key.includes("..") || key.includes("//");
}

/** Validates that a storage key belongs to the given patient chart upload folder. */
export function isValidRecordsStorageKey(storageKey: string, chartId: string): boolean {
  if (!storageKey?.trim() || hasTraversal(storageKey)) return false;
  const prefix = `${recordsFolder(chartId)}/`;
  return storageKey.startsWith(prefix);
}

/** Validates a patient-owned document upload key. */
export function isValidPatientDocsStorageKey(storageKey: string, userId: string): boolean {
  if (!storageKey?.trim() || hasTraversal(storageKey)) return false;
  const prefix = `${patientDocsFolder(userId)}/`;
  return storageKey.startsWith(prefix);
}

/** Validates a nutrition diary photo key for the owning patient user. */
export function isValidNutritionDiaryPhotoKey(photoKey: string, userId: string): boolean {
  if (!photoKey?.trim() || hasTraversal(photoKey)) return false;
  const prefix = `${nutritionDiaryFolder(userId)}/`;
  return photoKey.startsWith(prefix);
}

/** FDI tooth numbers: permanent (11–48) and deciduous (51–85). */
export function isValidFdiToothNumber(n: number): boolean {
  if (!Number.isInteger(n)) return false;
  const quadrant = Math.floor(n / 10);
  const position = n % 10;
  if (quadrant >= 1 && quadrant <= 4) return position >= 1 && position <= 8;
  if (quadrant >= 5 && quadrant <= 8) return position >= 1 && position <= 5;
  return false;
}

/** Rejects timestamps more than toleranceMs in the future (clock skew). */
export function isAcceptableTakenAt(iso: string, toleranceMs = 5 * 60 * 1000): boolean {
  const taken = new Date(iso);
  if (Number.isNaN(taken.getTime())) return false;
  return taken.getTime() <= Date.now() + toleranceMs;
}
