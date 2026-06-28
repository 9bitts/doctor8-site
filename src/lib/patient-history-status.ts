import { decrypt } from "@/lib/encryption";

export function isPatientHistoryFilled(notesEncrypted: string | null | undefined): boolean {
  if (!notesEncrypted) return false;
  try {
    const data = JSON.parse(decrypt(notesEncrypted)) as Record<string, unknown>;
    const textFields = [
      "chiefComplaint", "allergies", "currentMedications", "pastSurgeries",
      "familyHistory", "bloodType", "patientName",
    ];
    if (textFields.some((k) => {
      const v = data[k];
      return typeof v === "string" && v.trim().length > 0;
    })) return true;
    const arrays = ["chronicConditions", "disabilities", "reviewSystems", "vaccines"];
    return arrays.some((k) => Array.isArray(data[k]) && (data[k] as unknown[]).length > 0);
  } catch {
    return false;
  }
}
