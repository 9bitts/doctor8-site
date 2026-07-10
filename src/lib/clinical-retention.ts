import { db } from "@/lib/db";

/** Minimum retention period for medical charts (CFM 1.821/2007 — confirm with legal counsel). */
export const MEDICAL_RECORD_RETENTION_YEARS = 20;

export async function userHasClinicalRecords(userId: string): Promise<boolean> {
  const [patientProfile, professionalProfile] = await Promise.all([
    db.patientProfile.findUnique({ where: { userId }, select: { id: true } }),
    db.professionalProfile.findUnique({ where: { userId }, select: { id: true } }),
  ]);

  if (professionalProfile) {
    const [chartCount, rxCount] = await Promise.all([
      db.patientRecord.count({ where: { professionalId: professionalProfile.id } }),
      db.prescription.count({ where: { professionalId: professionalProfile.id } }),
    ]);
    if (chartCount > 0 || rxCount > 0) return true;
  }

  if (patientProfile) {
    const [linkedCharts, appointments] = await Promise.all([
      db.patientRecord.count({ where: { linkedUserId: userId } }),
      db.appointment.count({ where: { patientId: patientProfile.id } }),
    ]);
    if (linkedCharts > 0 || appointments > 0) return true;
  }

  return false;
}
