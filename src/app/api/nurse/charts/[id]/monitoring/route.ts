import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireChartAccess, requireNurseProfessional } from "@/lib/nursing/nursing-api";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireNurseProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireChartAccess(professional.id, params.id, false, session.user.id);
  if ("error" in access) return access.error;

  const entries = await db.nursingMonitoringEntry.findMany({
    where: { patientRecordId: params.id },
    orderBy: { recordedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      symptoms: e.symptoms,
      severity: e.severity,
      notes: e.notes,
      recordedAt: e.recordedAt.toISOString(),
    })),
  });
}
