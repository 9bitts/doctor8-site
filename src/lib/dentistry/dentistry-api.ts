import { NextResponse } from "next/server";
import { requireProfessional } from "@/lib/psychology-api";
import { isDentistSpecialty } from "@/lib/profession-label";
import { getRecordWithAccess, canEditChart } from "@/lib/chart-access";
import { db } from "@/lib/db";

export async function requireDentistProfessional() {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx;
  if (!isDentistSpecialty(ctx.professional.specialty)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return ctx;
}

export async function requireDentalChartAccess(
  professionalId: string,
  chartId: string,
  requireEdit = false,
  viewerUserId?: string,
) {
  const found = await getRecordWithAccess(professionalId, chartId, requireEdit, viewerUserId);
  if (!found) {
    return { error: NextResponse.json({ error: "Chart not found" }, { status: 404 }) };
  }
  if (requireEdit && !canEditChart(found.access)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { record: found.record, access: found.access };
}

export async function listDentalCharts(professionalId: string) {
  return db.patientRecord.findMany({
    where: { professionalId },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
}
