import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { listChartPrescriptionsForMedCheck } from "@/lib/nursing/chart-prescriptions";
import { medCheckBodySchema } from "@/lib/nursing/med-check-types";
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

  const data = await listChartPrescriptionsForMedCheck(params.id);
  return NextResponse.json(data);
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
  const parsed = medCheckBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const check = await db.nursingMedCheck.create({
    data: {
      patientRecordId: params.id,
      nurseId: professional.id,
      sourceType: parsed.data.sourceType,
      medicalPrescriptionId: parsed.data.medicalPrescriptionId ?? null,
      nursingMedPrescriptionId: parsed.data.nursingMedPrescriptionId ?? null,
      medicationName: parsed.data.medicationName,
      medicationSnapshot: parsed.data.medicationSnapshot as Prisma.InputJsonValue,
      sixRights: parsed.data.sixRights as Prisma.InputJsonValue,
      result: parsed.data.result,
      divergenceReason: parsed.data.divergenceReason ?? null,
      notes: parsed.data.notes ?? null,
    },
  });

  return NextResponse.json({ id: check.id, result: check.result }, { status: 201 });
}
