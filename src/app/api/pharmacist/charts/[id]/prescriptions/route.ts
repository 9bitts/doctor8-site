import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatLicense, getProfessionInfo } from "@/lib/profession-label";
import { pharmaPrescriptionBodySchema } from "@/lib/pharmacy/types";
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

  const prescriptions = await db.pharmacyPrescription.findMany({
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
  const ctx = await requirePharmacistProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireChartAccess(professional.id, params.id, true, session.user.id);
  if ("error" in access) return access.error;

  const body = await req.json();
  const parsed = pharmaPrescriptionBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const info = getProfessionInfo(professional.specialty || "Pharmacist");
  const licenseSnapshot = formatLicense(
    professional.licenseNumber || "",
    professional.licenseState,
    info.councilKey,
  );

  const rx = await db.pharmacyPrescription.create({
    data: {
      patientRecordId: params.id,
      professionalId: professional.id,
      medications: parsed.data.medications as Prisma.InputJsonValue,
      instructions: parsed.data.instructions ?? null,
      validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
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
