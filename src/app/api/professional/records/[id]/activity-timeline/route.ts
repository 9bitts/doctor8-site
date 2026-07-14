import { NextRequest, NextResponse } from "next/server";
import { getRecordWithAccess } from "@/lib/chart-access";
import { buildChartActivityTimeline } from "@/lib/chart-activity-timeline";
import { requireProfessional } from "@/lib/psychology-api";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessional();
  if ("error" in ctx && ctx.error) return ctx.error;

  const { professional } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const result = await getRecordWithAccess(professional.id, params.id);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const events = await buildChartActivityTimeline(params.id);

  return NextResponse.json({ events });
}
