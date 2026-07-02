import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function upsertActiveDiagnosis(
  patientRecordId: string,
  cidCode: string,
  cidLabel: string | null | undefined,
  sourceDocumentId?: string | null,
) {
  const code = cidCode.trim();
  if (!code) return null;

  // Serializable so concurrent callers (e.g. document save + manual diagnosis
  // POST for the same CID) cannot both pass the existence check and each create
  // a duplicate ACTIVE row. There is no DB-level @@unique for this compound key,
  // so the isolation level is what prevents the race.
  return db.$transaction(
    async (tx) => {
      const existing = await tx.patientDiagnosis.findFirst({
        where: { patientRecordId, cidCode: code, status: "ACTIVE" },
      });
      if (existing) {
        if (cidLabel && !existing.cidLabel) {
          return tx.patientDiagnosis.update({
            where: { id: existing.id },
            data: { cidLabel: cidLabel.trim() },
          });
        }
        return existing;
      }

      return tx.patientDiagnosis.create({
        data: {
          patientRecordId,
          cidCode: code,
          cidLabel: cidLabel?.trim() || null,
          sourceDocumentId: sourceDocumentId || null,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
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
