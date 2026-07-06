import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { requirePatientLinkedChart } from "@/lib/nursing/nursing-api";

const createSchema = z.object({
  chartId: z.string(),
  symptoms: z.string().min(1),
  severity: z.number().int().min(0).max(10).optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const chartId = req.nextUrl.searchParams.get("chartId");
  if (!chartId) {
    return NextResponse.json({ error: "chartId required" }, { status: 400 });
  }

  const linked = await requirePatientLinkedChart(chartId, ctx.userId);
  if ("error" in linked) return linked.error;

  const entries = await db.nursingMonitoringEntry.findMany({
    where: { patientRecordId: chartId, patientUserId: ctx.userId },
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

export async function POST(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const linked = await requirePatientLinkedChart(parsed.data.chartId, ctx.userId);
  if ("error" in linked) return linked.error;

  const entry = await db.nursingMonitoringEntry.create({
    data: {
      patientRecordId: parsed.data.chartId,
      patientUserId: ctx.userId,
      symptoms: parsed.data.symptoms,
      severity: parsed.data.severity ?? null,
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
