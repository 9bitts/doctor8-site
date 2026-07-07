import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { requirePatientLinkedChart } from "@/lib/pharmacy/pharmacy-api";
import { patientMonitoringBodySchema } from "@/lib/pharmacy/types";

export async function GET(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const chartId = req.nextUrl.searchParams.get("chartId");
  if (!chartId) {
    return NextResponse.json({ error: "chartId required" }, { status: 400 });
  }

  const linked = await requirePatientLinkedChart(chartId, ctx.userId);
  if ("error" in linked) return linked.error;

  const entries = await db.pharmacyMonitoringEntry.findMany({
    where: { patientRecordId: chartId, patientUserId: ctx.userId },
    orderBy: { recordedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      metricType: e.metricType,
      value: e.value,
      unit: e.unit,
      medicationName: e.medicationName,
      notes: e.notes,
      recordedAt: e.recordedAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json();
  const parsed = patientMonitoringBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const linked = await requirePatientLinkedChart(parsed.data.chartId, ctx.userId);
  if ("error" in linked) return linked.error;

  const entry = await db.pharmacyMonitoringEntry.create({
    data: {
      patientRecordId: parsed.data.chartId,
      patientUserId: ctx.userId,
      metricType: parsed.data.metricType,
      value: parsed.data.value,
      unit: parsed.data.unit ?? null,
      medicationName: parsed.data.medicationName ?? null,
      notes: parsed.data.notes ?? null,
    },
  });

  return NextResponse.json(
    {
      id: entry.id,
      recordedAt: entry.recordedAt.toISOString(),
    },
    { status: 201 },
  );
}
