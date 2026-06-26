import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfessional } from "@/lib/psychology-api";
import { db } from "@/lib/db";

const patchSchema = z.object({
  status: z.enum(["ACTIVE", "RESOLVED"]),
});

async function getOwnedRecord(professionalId: string, recordId: string) {
  return db.patientRecord.findFirst({
    where: { id: recordId, professionalId },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; diagId: string } },
) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const record = await getOwnedRecord(professional.id, params.id);
  if (!record) return NextResponse.json({ error: "Chart not found" }, { status: 404 });

  const existing = await db.patientDiagnosis.findFirst({
    where: { id: params.diagId, patientRecordId: record.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await db.patientDiagnosis.update({
    where: { id: existing.id },
    data: {
      status: parsed.data.status,
      resolvedAt: parsed.data.status === "RESOLVED" ? new Date() : null,
    },
  });

  return NextResponse.json({
    id: updated.id,
    cidCode: updated.cidCode,
    cidLabel: updated.cidLabel,
    status: updated.status,
    notedAt: updated.notedAt.toISOString(),
    resolvedAt: updated.resolvedAt?.toISOString() ?? null,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; diagId: string } },
) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const record = await getOwnedRecord(professional.id, params.id);
  if (!record) return NextResponse.json({ error: "Chart not found" }, { status: 404 });

  const existing = await db.patientDiagnosis.findFirst({
    where: { id: params.diagId, patientRecordId: record.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.patientDiagnosis.delete({ where: { id: existing.id } });
  return NextResponse.json({ success: true });
}
