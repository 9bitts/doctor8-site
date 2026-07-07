import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireDentalChartAccess, requireDentistProfessional } from "@/lib/dentistry/dentistry-api";

const upsertSchema = z.object({
  applianceType: z.string().optional(),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED"]).optional(),
  startDate: z.string().datetime().optional(),
  estimatedEndDate: z.string().datetime().optional(),
  lastMaintenanceAt: z.string().datetime().optional(),
  nextMaintenanceAt: z.string().datetime().optional(),
  alignerNumber: z.number().int().optional(),
  notes: z.string().optional(),
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

  const records = await db.orthodonticRecord.findMany({
    where: { patientRecordId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ records });
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
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const record = await db.orthodonticRecord.create({
    data: {
      patientRecordId: params.id,
      professionalId: professional.id,
      applianceType: parsed.data.applianceType ?? "fixed",
      status: parsed.data.status ?? "ACTIVE",
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : new Date(),
      estimatedEndDate: parsed.data.estimatedEndDate ? new Date(parsed.data.estimatedEndDate) : null,
      lastMaintenanceAt: parsed.data.lastMaintenanceAt ? new Date(parsed.data.lastMaintenanceAt) : null,
      nextMaintenanceAt: parsed.data.nextMaintenanceAt ? new Date(parsed.data.nextMaintenanceAt) : null,
      alignerNumber: parsed.data.alignerNumber ?? null,
      notes: parsed.data.notes?.trim() || null,
    },
  });

  return NextResponse.json({ id: record.id, status: record.status }, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireDentistProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireDentalChartAccess(professional.id, params.id, true, session.user.id);
  if ("error" in access) return access.error;

  const body = await req.json();
  const { recordId, ...rest } = body as { recordId?: string };
  if (!recordId) return NextResponse.json({ error: "recordId required" }, { status: 400 });

  const parsed = upsertSchema.safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.orthodonticRecord.findFirst({
    where: { id: recordId, patientRecordId: params.id, professionalId: professional.id },
  });
  if (!existing) return NextResponse.json({ error: "Record not found" }, { status: 404 });

  const updated = await db.orthodonticRecord.update({
    where: { id: recordId },
    data: {
      ...(parsed.data.applianceType ? { applianceType: parsed.data.applianceType } : {}),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.lastMaintenanceAt ? { lastMaintenanceAt: new Date(parsed.data.lastMaintenanceAt) } : {}),
      ...(parsed.data.nextMaintenanceAt ? { nextMaintenanceAt: new Date(parsed.data.nextMaintenanceAt) } : {}),
      ...(parsed.data.alignerNumber !== undefined ? { alignerNumber: parsed.data.alignerNumber } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes?.trim() || null } : {}),
    },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
