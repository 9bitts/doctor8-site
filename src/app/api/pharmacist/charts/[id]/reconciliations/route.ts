import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { reconciliationBodySchema } from "@/lib/pharmacy/types";
import { requireChartAccess, requirePharmacistProfessional } from "@/lib/pharmacy/pharmacy-api";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePharmacistProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireChartAccess(professional.id, params.id, false, session.user.id);
  if ("error" in access) return access.error;

  const rows = await db.pharmacyReconciliation.findMany({
    where: { patientRecordId: params.id },
    orderBy: { reconciledAt: "desc" },
    take: 40,
  });

  return NextResponse.json({
    reconciliations: rows.map((r) => ({
      id: r.id,
      sourceContext: r.sourceContext,
      medicationsBefore: r.medicationsBefore,
      medicationsAfter: r.medicationsAfter,
      discrepancies: r.discrepancies,
      notes: r.notes,
      reconciledAt: r.reconciledAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePharmacistProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireChartAccess(professional.id, params.id, true, session.user.id);
  if ("error" in access) return access.error;

  const body = await req.json();
  const parsed = reconciliationBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const row = await db.pharmacyReconciliation.create({
    data: {
      patientRecordId: params.id,
      professionalId: professional.id,
      sourceContext: parsed.data.sourceContext,
      medicationsBefore: parsed.data.medicationsBefore as Prisma.InputJsonValue,
      medicationsAfter: parsed.data.medicationsAfter as Prisma.InputJsonValue,
      discrepancies: parsed.data.discrepancies as Prisma.InputJsonValue,
      notes: parsed.data.notes ?? null,
    },
  });

  return NextResponse.json(
    {
      id: row.id,
      reconciledAt: row.reconciledAt.toISOString(),
    },
    { status: 201 },
  );
}
