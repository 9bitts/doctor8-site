import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createMetricSnapshot } from "@/lib/clinical-diagnosis";
import {
  computeBmi,
  requireChartAccess,
  requireNutritionProfessional,
} from "@/lib/nutrition/nutrition-api";

const createSchema = z.object({
  weightKg: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  waistCm: z.number().positive().optional(),
  hipCm: z.number().positive().optional(),
  armCm: z.number().positive().optional(),
  thighCm: z.number().positive().optional(),
  bodyFatPercent: z.number().min(0).max(100).optional(),
  notes: z.string().max(5000).optional(),
  recordedAt: z.string().datetime().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireNutritionProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireChartAccess(professional.id, params.id, false, session.user.id);
  if ("error" in access) return access.error;

  const entries = await db.nutritionAnthropometryEntry.findMany({
    where: { patientRecordId: params.id },
    orderBy: { recordedAt: "asc" },
  });

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      recordedAt: e.recordedAt.toISOString(),
      weightKg: e.weightKg,
      heightCm: e.heightCm,
      bmi: e.bmi,
      waistCm: e.waistCm,
      hipCm: e.hipCm,
      armCm: e.armCm,
      thighCm: e.thighCm,
      bodyFatPercent: e.bodyFatPercent,
      notes: e.notes,
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireNutritionProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireChartAccess(professional.id, params.id, true, session.user.id);
  if ("error" in access) return access.error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const bmi =
    d.weightKg && d.heightCm ? computeBmi(d.weightKg, d.heightCm) : null;

  const entry = await db.nutritionAnthropometryEntry.create({
    data: {
      patientRecordId: params.id,
      professionalId: professional.id,
      recordedAt: d.recordedAt ? new Date(d.recordedAt) : undefined,
      weightKg: d.weightKg ?? null,
      heightCm: d.heightCm ?? null,
      bmi,
      waistCm: d.waistCm ?? null,
      hipCm: d.hipCm ?? null,
      armCm: d.armCm ?? null,
      thighCm: d.thighCm ?? null,
      bodyFatPercent: d.bodyFatPercent ?? null,
      notes: d.notes ?? null,
    },
  });

  if (d.weightKg || d.heightCm) {
    await createMetricSnapshot(params.id, null, {
      weightKg: d.weightKg ?? null,
      heightCm: d.heightCm ?? null,
      bmi,
    });
  }

  return NextResponse.json(
    {
      id: entry.id,
      recordedAt: entry.recordedAt.toISOString(),
      weightKg: entry.weightKg,
      heightCm: entry.heightCm,
      bmi: entry.bmi,
      waistCm: entry.waistCm,
      hipCm: entry.hipCm,
      armCm: entry.armCm,
      thighCm: entry.thighCm,
      bodyFatPercent: entry.bodyFatPercent,
      notes: entry.notes,
    },
    { status: 201 },
  );
}
