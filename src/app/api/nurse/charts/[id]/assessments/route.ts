import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { saeBodySchema } from "@/lib/nursing/sae-types";
import { requireChartAccess, requireNurseProfessional } from "@/lib/nursing/nursing-api";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireNurseProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireChartAccess(professional.id, params.id, false, session.user.id);
  if ("error" in access) return access.error;

  const rows = await db.nursingAssessment.findMany({
    where: { patientRecordId: params.id },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    assessments: rows.map((r) => ({
      id: r.id,
      data: r.data,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
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
  const parsed = saeBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const row = await db.nursingAssessment.create({
    data: {
      patientRecordId: params.id,
      professionalId: professional.id,
      data: parsed.data.data,
    },
  });

  return NextResponse.json(
    {
      id: row.id,
      data: row.data,
      createdAt: row.createdAt.toISOString(),
    },
    { status: 201 },
  );
}
