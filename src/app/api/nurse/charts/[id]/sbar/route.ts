import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sbarBodySchema } from "@/lib/nursing/sbar-types";
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

  const reports = await db.nursingSbarReport.findMany({
    where: { patientRecordId: params.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({
    reports: reports.map((r) => ({
      id: r.id,
      situation: r.situation,
      background: r.background,
      assessment: r.assessment,
      recommendation: r.recommendation,
      recipientNote: r.recipientNote,
      status: r.status,
      appointmentId: r.appointmentId,
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
  const parsed = sbarBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const report = await db.nursingSbarReport.create({
    data: {
      patientRecordId: params.id,
      professionalId: professional.id,
      situation: parsed.data.situation,
      background: parsed.data.background,
      assessment: parsed.data.assessment,
      recommendation: parsed.data.recommendation,
      recipientNote: parsed.data.recipientNote ?? null,
      appointmentId: parsed.data.appointmentId ?? null,
      status: parsed.data.status ?? "DRAFT",
    },
  });

  return NextResponse.json({ id: report.id, status: report.status }, { status: 201 });
}
