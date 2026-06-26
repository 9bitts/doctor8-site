import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfessional } from "@/lib/psychology-api";
import { db } from "@/lib/db";
import { getRecordWithAccess } from "@/lib/chart-access";
import { hasAnyThreshold, parseAudiogramThresholds } from "@/lib/audiometry";

const conductionSchema = z.record(
  z.enum(["250", "500", "1000", "2000", "4000", "8000"]),
  z.number().min(-10).max(120),
).optional();

const earSchema = z.object({
  ac: conductionSchema,
  bc: conductionSchema,
}).optional();

const createSchema = z.object({
  testedAt: z.string().min(1),
  thresholds: z.object({
    right: earSchema,
    left: earSchema,
  }),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;

  const found = await getRecordWithAccess(ctx.professional.id, params.id);
  if (!found) return NextResponse.json({ error: "Chart not found" }, { status: 404 });

  const rows = await db.patientAudiogram.findMany({
    where: { patientRecordId: found.record.id },
    orderBy: { testedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    audiograms: rows.map((r) => ({
      id: r.id,
      testedAt: r.testedAt.toISOString(),
      thresholds: parseAudiogramThresholds(r.thresholds),
      notes: r.notes,
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const found = await getRecordWithAccess(professional.id, params.id, true);
  if (!found) return NextResponse.json({ error: "Chart not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const thresholds = parseAudiogramThresholds(parsed.data.thresholds);
  if (!hasAnyThreshold(thresholds)) {
    return NextResponse.json({ error: "No thresholds provided" }, { status: 400 });
  }

  const testedAt = new Date(parsed.data.testedAt);
  if (Number.isNaN(testedAt.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const row = await db.patientAudiogram.create({
    data: {
      patientRecordId: found.record.id,
      testedAt,
      thresholds,
      notes: parsed.data.notes?.trim() || null,
      recordedById: professional.id,
    },
  });

  return NextResponse.json({
    id: row.id,
    testedAt: row.testedAt.toISOString(),
    thresholds,
    notes: row.notes,
  }, { status: 201 });
}
