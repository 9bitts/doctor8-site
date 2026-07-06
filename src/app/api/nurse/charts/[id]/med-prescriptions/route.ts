import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatLicense, getProfessionInfo } from "@/lib/profession-label";
import { nursingMedRxBodySchema } from "@/lib/nursing/med-prescription-types";
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

  const prescriptions = await db.nursingMedicationPrescription.findMany({
    where: { patientRecordId: params.id },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return NextResponse.json({
    prescriptions: prescriptions.map((p) => ({
      id: p.id,
      medications: p.medications,
      instructions: p.instructions,
      validUntil: p.validUntil?.toISOString() ?? null,
      cofenCategory: p.cofenCategory,
      licenseSnapshot: p.licenseSnapshot,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
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
  const parsed = nursingMedRxBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const info = getProfessionInfo(professional.specialty || "Nurse");
  const licenseSnapshot = formatLicense(
    professional.licenseNumber || "",
    professional.licenseState,
    info.councilKey,
  );

  const validUntil = new Date(Date.now() + parsed.data.validDays * 24 * 60 * 60 * 1000);

  const rx = await db.nursingMedicationPrescription.create({
    data: {
      patientRecordId: params.id,
      professionalId: professional.id,
      medications: parsed.data.medications,
      instructions: parsed.data.instructions ?? null,
      validUntil,
      cofenCategory: parsed.data.cofenCategory ?? null,
      licenseSnapshot: licenseSnapshot || null,
      status: parsed.data.status ?? "ACTIVE",
    },
  });

  return NextResponse.json(
    {
      id: rx.id,
      validUntil: rx.validUntil?.toISOString() ?? null,
      status: rx.status,
    },
    { status: 201 },
  );
}
