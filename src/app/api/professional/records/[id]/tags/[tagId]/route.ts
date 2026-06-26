import { NextRequest, NextResponse } from "next/server";
import { requireProfessional } from "@/lib/psychology-api";
import { db } from "@/lib/db";
import { getRecordWithAccess } from "@/lib/chart-access";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; tagId: string } },
) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const found = await getRecordWithAccess(professional.id, params.id, true);
  if (!found) return NextResponse.json({ error: "Chart not found" }, { status: 404 });
  const { record } = found;

  const tag = await db.patientRecordTag.findFirst({
    where: { id: params.tagId, patientRecordId: record.id },
  });
  if (!tag) return NextResponse.json({ error: "Tag not found" }, { status: 404 });

  await db.patientRecordTag.delete({ where: { id: tag.id } });
  return NextResponse.json({ success: true });
}
