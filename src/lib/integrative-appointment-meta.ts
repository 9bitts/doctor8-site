import { db } from "@/lib/db";

export type IntegrativeVisitMeta = {
  visitType: "first" | "return";
  sessionCount: number;
  suggestedDurationMins: number;
  mainPractice: string | null;
};

export async function getIntegrativeVisitMetaByPatientUserIds(
  integrativeTherapistId: string,
  patientUserIds: string[],
): Promise<Map<string, IntegrativeVisitMeta>> {
  const result = new Map<string, IntegrativeVisitMeta>();
  if (patientUserIds.length === 0) return result;

  const records = await db.integrativeClientRecord.findMany({
    where: {
      integrativeTherapistId,
      linkedUserId: { in: patientUserIds },
    },
    select: { id: true, linkedUserId: true, mainPractice: true },
  });

  const recordIds = records.map((r) => r.id);
  const counts =
    recordIds.length > 0
      ? await db.medicalDocument.groupBy({
          by: ["integrativeClientRecordId"],
          where: {
            integrativeClientRecordId: { in: recordIds },
            integrativeTherapistId,
            type: "CLINICAL_NOTE",
          },
          _count: { _all: true },
        })
      : [];

  const countByRecord = new Map(
    counts.map((c) => [c.integrativeClientRecordId, c._count._all]),
  );

  for (const record of records) {
    if (!record.linkedUserId) continue;
    const sessionCount = countByRecord.get(record.id) ?? 0;
    result.set(record.linkedUserId, {
      visitType: sessionCount === 0 ? "first" : "return",
      sessionCount,
      suggestedDurationMins: sessionCount === 0 ? 60 : 30,
      mainPractice: record.mainPractice,
    });
  }

  for (const userId of patientUserIds) {
    if (!result.has(userId)) {
      result.set(userId, {
        visitType: "first",
        sessionCount: 0,
        suggestedDurationMins: 60,
        mainPractice: null,
      });
    }
  }

  return result;
}
