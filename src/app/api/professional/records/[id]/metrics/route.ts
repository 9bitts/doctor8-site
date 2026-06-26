import { NextRequest, NextResponse } from "next/server";
import { requireProfessional } from "@/lib/psychology-api";
import { db } from "@/lib/db";

async function getOwnedRecord(professionalId: string, recordId: string) {
  return db.patientRecord.findFirst({
    where: { id: recordId, professionalId },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const record = await getOwnedRecord(professional.id, params.id);
  if (!record) return NextResponse.json({ error: "Chart not found" }, { status: 404 });

  const snapshots = await db.clinicalMetricSnapshot.findMany({
    where: { patientRecordId: record.id },
    orderBy: { recordedAt: "asc" },
  });

  return NextResponse.json({
    snapshots: snapshots.map((s) => ({
      id: s.id,
      recordedAt: s.recordedAt.toISOString(),
      documentId: s.documentId,
      weightKg: s.weightKg,
      heightCm: s.heightCm,
      systolicBp: s.systolicBp,
      diastolicBp: s.diastolicBp,
      heartRate: s.heartRate,
      glucoseMgDl: s.glucoseMgDl,
      temperatureC: s.temperatureC,
      spo2Percent: s.spo2Percent,
      bmi: s.bmi,
    })),
  });
}
