import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireChartAccess, requireNurseProfessional } from "@/lib/nursing/nursing-api";
import {
  calcBradenScore,
  calcGlasgowScore,
  calcMorseScore,
  calcPainScore,
} from "@/lib/nursing/scales";

const createSchema = z.object({
  scaleType: z.enum(["BRADEN", "MORSE", "PAIN", "GLASGOW"]),
  details: z.record(z.unknown()).optional(),
  notes: z.string().optional(),
  recordedAt: z.string().datetime().optional(),
});

function computeScore(scaleType: string, details: Record<string, unknown> | undefined): number {
  if (!details) return 0;
  switch (scaleType) {
    case "BRADEN":
      return calcBradenScore(details as Parameters<typeof calcBradenScore>[0]);
    case "MORSE":
      return calcMorseScore(details as Parameters<typeof calcMorseScore>[0]);
    case "PAIN":
      return calcPainScore(Number(details.value ?? 0));
    case "GLASGOW":
      return calcGlasgowScore(details as Parameters<typeof calcGlasgowScore>[0]);
    default:
      return 0;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireNurseProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireChartAccess(professional.id, params.id, false, session.user.id);
  if ("error" in access) return access.error;

  const entries = await db.nursingScaleEntry.findMany({
    where: { patientRecordId: params.id },
    orderBy: { recordedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      scaleType: e.scaleType,
      score: e.score,
      details: e.details,
      notes: e.notes,
      recordedAt: e.recordedAt.toISOString(),
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireNurseProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireChartAccess(professional.id, params.id, true, session.user.id);
  if ("error" in access) return access.error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const score = computeScore(parsed.data.scaleType, parsed.data.details);

  const entry = await db.nursingScaleEntry.create({
    data: {
      patientRecordId: params.id,
      professionalId: professional.id,
      scaleType: parsed.data.scaleType,
      score,
      details: (parsed.data.details ?? undefined) as Prisma.InputJsonValue | undefined,
      notes: parsed.data.notes ?? null,
      recordedAt: parsed.data.recordedAt ? new Date(parsed.data.recordedAt) : new Date(),
    },
  });

  return NextResponse.json(
    {
      id: entry.id,
      scaleType: entry.scaleType,
      score: entry.score,
      recordedAt: entry.recordedAt.toISOString(),
    },
    { status: 201 },
  );
}
