import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { canEditChart, resolveChartAccess } from "@/lib/chart-access";

export async function saveChartEvolution(params: {
  professionalId: string;
  patientRecordId: string;
  title: string;
  content: string;
}) {
  const access = await resolveChartAccess(params.professionalId, params.patientRecordId);
  if (!canEditChart(access)) throw new Error("CHART_FORBIDDEN");

  const record = await db.patientRecord.findUnique({
    where: { id: params.patientRecordId },
    select: { id: true, professionalId: true },
  });
  if (!record) throw new Error("CHART_NOT_FOUND");

  return db.medicalDocument.create({
    data: {
      patientRecordId: params.patientRecordId,
      professionalId: record.professionalId,
      type: "CLINICAL_NOTE",
      recordKind: "EVOLUTION",
      title: encrypt(params.title),
      content: encrypt(params.content),
    },
    select: { id: true, createdAt: true },
  });
}
