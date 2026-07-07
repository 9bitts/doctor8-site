import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { educationBodySchema } from "@/lib/pharmacy/types";
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

  const sessions = await db.pharmacyEducationSession.findMany({
    where: { patientRecordId: params.id },
    orderBy: { conductedAt: "desc" },
    take: 40,
  });

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      topic: s.topic,
      educationType: s.educationType,
      content: s.content,
      materials: s.materials,
      patientFeedback: s.patientFeedback,
      durationMin: s.durationMin,
      conductedAt: s.conductedAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
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
  const parsed = educationBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const session_ = await db.pharmacyEducationSession.create({
    data: {
      patientRecordId: params.id,
      professionalId: professional.id,
      topic: parsed.data.topic,
      educationType: parsed.data.educationType ?? "MEDICATION",
      content: parsed.data.content,
      materials: parsed.data.materials as Prisma.InputJsonValue | undefined,
      patientFeedback: parsed.data.patientFeedback ?? null,
      durationMin: parsed.data.durationMin ?? null,
    },
  });

  return NextResponse.json(
    {
      id: session_.id,
      conductedAt: session_.conductedAt.toISOString(),
    },
    { status: 201 },
  );
}
