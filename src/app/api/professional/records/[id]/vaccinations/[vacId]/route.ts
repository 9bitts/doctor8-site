import { NextRequest, NextResponse } from "next/server";
import { requireProfessional } from "@/lib/psychology-api";
import { db } from "@/lib/db";
import { getRecordWithAccess } from "@/lib/chart-access";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; vacId: string } },
) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const found = await getRecordWithAccess(professional.id, params.id, true);
  if (!found) return NextResponse.json({ error: "Chart not found" }, { status: 404 });
  const { record } = found;

  const existing = await db.patientVaccination.findFirst({
    where: { id: params.vacId, patientRecordId: record.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.patientVaccination.delete({ where: { id: existing.id } });
  return NextResponse.json({ success: true });
}
