import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireDentalChartAccess, requireDentistProfessional } from "@/lib/dentistry/dentistry-api";

const createSchema = z.object({
  responses: z.record(z.unknown()),
  tcleSigned: z.boolean().optional(),
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

  const records = await db.dentalAnamnesis.findMany({
    where: { patientRecordId: params.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({
    records: records.map((r) => ({
      id: r.id,
      status: r.status,
      responses: r.responses,
      tcleSignedAt: r.tcleSignedAt?.toISOString() ?? null,
      completedAt: r.completedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date();
  const record = await db.dentalAnamnesis.create({
    data: {
      patientRecordId: params.id,
      professionalId: professional.id,
      status: "COMPLETED",
      responses: parsed.data.responses as Prisma.InputJsonValue,
      tcleSignedAt: parsed.data.tcleSigned ? now : null,
      completedAt: now,
    },
  });

  return NextResponse.json({ id: record.id, status: record.status }, { status: 201 });
}
