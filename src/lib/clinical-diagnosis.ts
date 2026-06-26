import { db } from "@/lib/db";

export async function upsertActiveDiagnosis(
  patientRecordId: string,
  cidCode: string,
  cidLabel: string | null | undefined,
  sourceDocumentId?: string | null,
) {
  if (!cidCode.trim()) return null;

  const existing = await db.patientDiagnosis.findFirst({
    where: {
      patientRecordId,
      cidCode: cidCode.trim(),
      status: "ACTIVE",
    },
  });
  if (existing) {
    if (cidLabel && !existing.cidLabel) {
      return db.patientDiagnosis.update({
        where: { id: existing.id },
        data: { cidLabel },
      });
    }
    return existing;
  }

  return db.patientDiagnosis.create({
    data: {
      patientRecordId,
      cidCode: cidCode.trim(),
      cidLabel: cidLabel?.trim() || null,
      sourceDocumentId: sourceDocumentId || null,
    },
  });
}

export async function createMetricSnapshot(
  patientRecordId: string,
  documentId: string | null,
  metrics: {
    weightKg?: number | null;
    heightCm?: number | null;
    headCircumferenceCm?: number | null;
    systolicBp?: number | null;
    diastolicBp?: number | null;
    heartRate?: number | null;
    glucoseMgDl?: number | null;
    temperatureC?: number | null;
    spo2Percent?: number | null;
    bmi?: number | null;
  },
) {
  return db.clinicalMetricSnapshot.create({
    data: {
      patientRecordId,
      documentId,
      weightKg: metrics.weightKg ?? null,
      heightCm: metrics.heightCm ?? null,
      headCircumferenceCm: metrics.headCircumferenceCm ?? null,
      systolicBp: metrics.systolicBp ?? null,
      diastolicBp: metrics.diastolicBp ?? null,
      heartRate: metrics.heartRate ?? null,
      glucoseMgDl: metrics.glucoseMgDl ?? null,
      temperatureC: metrics.temperatureC ?? null,
      spo2Percent: metrics.spo2Percent ?? null,
      bmi: metrics.bmi ?? null,
    },
  });
}
