import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireDentalChartAccess, requireDentistProfessional } from "@/lib/dentistry/dentistry-api";
import { parsePeriodontogramTeeth } from "@/lib/dentistry/periodontogram";

const putSchema = z.object({
  teeth: z.record(z.string(), z.unknown()),
  notes: z.string().max(5000).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireDentistProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireDentalChartAccess(professional.id, params.id, false, session.user.id);
  if ("error" in access) return access.error;

  const records = await db.patientPeriodontogram.findMany({
    where: { patientRecordId: params.id },
    orderBy: { recordedAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    records: records.map((r) => ({
      id: r.id,
      teeth: parsePeriodontogramTeeth(r.teeth),
      notes: r.notes,
      recordedAt: r.recordedAt.toISOString(),
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireDentistProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireDentalChartAccess(professional.id, params.id, true, session.user.id);
  if ("error" in access) return access.error;

  const body = await req.json();
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const teeth = parsePeriodontogramTeeth(parsed.data.teeth);
  const record = await db.patientPeriodontogram.create({
    data: {
      patientRecordId: params.id,
      professionalId: professional.id,
      teeth: teeth as Prisma.InputJsonValue,
      notes: parsed.data.notes?.trim() || null,
    },
  });

  return NextResponse.json({
    id: record.id,
    teeth: parsePeriodontogramTeeth(record.teeth),
    recordedAt: record.recordedAt.toISOString(),
  }, { status: 201 });
}
