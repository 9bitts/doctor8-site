import { NextResponse } from "next/server";
import { requireProfessional } from "@/lib/psychology-api";
import { listSharedChartsForProfessional } from "@/lib/shared-charts-list";

export async function GET() {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;

  const items = await listSharedChartsForProfessional(ctx.professional.id);

  return NextResponse.json({
    charts: items.map((s) => ({
      shareId: s.recordId,
      recordId: s.recordId,
      permission: s.permission,
      patientName: `${s.firstName} ${s.lastName}`.trim(),
      ownerName: s.ownerName,
      sharedVia: s.sharedVia,
      sharedAt: s.updatedAt,
    })),
  });
}
