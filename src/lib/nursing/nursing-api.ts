import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProfessional } from "@/lib/psychology-api";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { getRecordWithAccess, canEditChart } from "@/lib/chart-access";
import { isNurseSpecialty } from "@/lib/profession-label";

export async function requireNurseProfessional() {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx;
  if (!isNurseSpecialty(ctx.professional.specialty)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return ctx;
}

export async function requireChartAccess(
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

export async function requirePatientLinkedChart(chartId: string, userId: string) {
  const record = await db.patientRecord.findFirst({
    where: { id: chartId, linkedUserId: userId },
    include: {
      professional: { select: { id: true, firstName: true, lastName: true, specialty: true } },
    },
  });
  if (!record) {
    return { error: NextResponse.json({ error: "Chart not found" }, { status: 404 }) };
  }
  return { record };
}

export async function listPatientNursingCharts(userId: string) {
  return db.patientRecord.findMany({
    where: {
      linkedUserId: userId,
      professional: {
        specialty: { in: ["Nurse", "Nursing", "Nurse Practitioner", "Midwife", "Obstetric Nurse"] },
      },
    },
    select: {
      id: true,
      professionalId: true,
      professional: { select: { firstName: true, lastName: true, specialty: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function requirePatientApi() {
  return requirePatient();
}

export { isApiError };
