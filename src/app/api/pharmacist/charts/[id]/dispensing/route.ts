import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { dispensingBodySchema } from "@/lib/pharmacy/types";
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

  const records = await db.pharmacyDispensingRecord.findMany({
    where: { patientRecordId: params.id },
    orderBy: { dispensedAt: "desc" },
    take: 40,
  });

  return NextResponse.json({
    records: records.map((r) => ({
      id: r.id,
      prescriptionId: r.prescriptionId,
      prescriptionSnapshot: r.prescriptionSnapshot,
      medicationsDispensed: r.medicationsDispensed,
      status: r.status,
      validationNotes: r.validationNotes,
      rejectionReason: r.rejectionReason,
      dispensedAt: r.dispensedAt.toISOString(),
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
  const parsed = dispensingBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const record = await db.pharmacyDispensingRecord.create({
    data: {
      patientRecordId: params.id,
      pharmacistId: professional.id,
      prescriptionId: parsed.data.prescriptionId ?? null,
      prescriptionSnapshot: parsed.data.prescriptionSnapshot as Prisma.InputJsonValue,
      medicationsDispensed: parsed.data.medicationsDispensed as Prisma.InputJsonValue,
      status: parsed.data.status,
      validationNotes: parsed.data.validationNotes ?? null,
      rejectionReason: parsed.data.rejectionReason ?? null,
    },
  });

  return NextResponse.json(
    {
      id: record.id,
      status: record.status,
      dispensedAt: record.dispensedAt.toISOString(),
    },
    { status: 201 },
  );
}
