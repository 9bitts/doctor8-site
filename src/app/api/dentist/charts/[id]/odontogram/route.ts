import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireDentalChartAccess, requireDentistProfessional } from "@/lib/dentistry/dentistry-api";
import { parseOdontogramTeeth } from "@/lib/odontogram";

const putSchema = z.object({
  dentitionType: z.enum(["PERMANENT", "DECIDUOUS", "MIXED"]).optional(),
  teeth: z.record(z.string(), z.unknown()).optional(),
  deciduousTeeth: z.record(z.string(), z.unknown()).optional(),
  generalNotes: z.string().max(5000).optional(),
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

  const record = await db.patientOdontogram.findUnique({
    where: { patientRecordId: params.id },
  });

  return NextResponse.json({
    dentitionType: record?.dentitionType ?? "PERMANENT",
    teeth: parseOdontogramTeeth(record?.teeth),
    deciduousTeeth: parseOdontogramTeeth(record?.deciduousTeeth),
    generalNotes: record?.generalNotes ?? "",
    updatedAt: record?.updatedAt?.toISOString() ?? null,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireDentistProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireDentalChartAccess(professional.id, params.id, true, session.user.id);
  if ("error" in access) return access.error;

  const body = await req.json().catch(() => ({}));
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const teeth = parsed.data.teeth ? parseOdontogramTeeth(parsed.data.teeth) : undefined;
  const deciduousTeeth = parsed.data.deciduousTeeth ? parseOdontogramTeeth(parsed.data.deciduousTeeth) : undefined;

  const record = await db.patientOdontogram.upsert({
    where: { patientRecordId: params.id },
    create: {
      patientRecordId: params.id,
      dentitionType: parsed.data.dentitionType ?? "PERMANENT",
      teeth: (teeth ?? {}) as Prisma.InputJsonValue,
      deciduousTeeth: (deciduousTeeth ?? {}) as Prisma.InputJsonValue,
      generalNotes: parsed.data.generalNotes?.trim() || null,
      recordedById: professional.id,
    },
    update: {
      ...(parsed.data.dentitionType ? { dentitionType: parsed.data.dentitionType } : {}),
      ...(teeth !== undefined ? { teeth: teeth as Prisma.InputJsonValue } : {}),
      ...(deciduousTeeth !== undefined ? { deciduousTeeth: deciduousTeeth as Prisma.InputJsonValue } : {}),
      ...(parsed.data.generalNotes !== undefined ? { generalNotes: parsed.data.generalNotes?.trim() || null } : {}),
      recordedById: professional.id,
    },
  });

  return NextResponse.json({
    dentitionType: record.dentitionType,
    teeth: parseOdontogramTeeth(record.teeth),
    deciduousTeeth: parseOdontogramTeeth(record.deciduousTeeth),
    generalNotes: record.generalNotes ?? "",
    updatedAt: record.updatedAt.toISOString(),
  });
}
