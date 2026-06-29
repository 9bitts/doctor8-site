import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfessional } from "@/lib/psychology-api";
import { db } from "@/lib/db";
import { getRecordWithAccess } from "@/lib/chart-access";
import { ODONTOGRAM_CONDITIONS, TOOTH_SURFACES, parseOdontogramTeeth } from "@/lib/odontogram";

const CONDITIONS = [
  "HEALTHY", "CARIES", "RESTORATION", "MISSING", "CROWN",
  "IMPLANT", "ROOT_CANAL", "FRACTURE", "TO_EXTRACT",
] as const;

const SURFACES = ["M", "O", "D", "V", "L"] as const;

const toothSchema = z.object({
  condition: z.enum(CONDITIONS),
  surfaces: z.array(z.enum(SURFACES)).optional(),
  notes: z.string().max(500).optional(),
});

const putSchema = z.object({
  teeth: z.record(z.string(), toothSchema),
  generalNotes: z.string().max(5000).optional().or(z.literal("")),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;

  const found = await getRecordWithAccess(ctx.professional.id, params.id, false, ctx.session.user.id);
  if (!found) return NextResponse.json({ error: "Chart not found" }, { status: 404 });

  const record = await db.patientOdontogram.findUnique({
    where: { patientRecordId: found.record.id },
  });

  return NextResponse.json({
    teeth: parseOdontogramTeeth(record?.teeth),
    generalNotes: record?.generalNotes ?? "",
    updatedAt: record?.updatedAt?.toISOString() ?? null,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const found = await getRecordWithAccess(professional.id, params.id, true);
  if (!found) return NextResponse.json({ error: "Chart not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const teeth = parseOdontogramTeeth(parsed.data.teeth);
  const generalNotes = parsed.data.generalNotes?.trim() || null;

  const record = await db.patientOdontogram.upsert({
    where: { patientRecordId: found.record.id },
    create: {
      patientRecordId: found.record.id,
      teeth,
      generalNotes,
      recordedById: professional.id,
    },
    update: {
      teeth,
      generalNotes,
      recordedById: professional.id,
    },
  });

  return NextResponse.json({
    teeth: parseOdontogramTeeth(record.teeth),
    generalNotes: record.generalNotes ?? "",
    updatedAt: record.updatedAt.toISOString(),
  });
}
