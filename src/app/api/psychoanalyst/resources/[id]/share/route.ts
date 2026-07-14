// POST — share a resource with an analysand

import { NextRequest, NextResponse } from "next/server";
import { requirePsychoanalyst } from "@/lib/psychoanalyst-api";
import { db } from "@/lib/db";
import { shareResourceWithAnalysand } from "@/lib/professional-library/share-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { psychoanalyst } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const resource = await db.resource.findUnique({ where: { id: params.id } });
  if (!resource || resource.psychoanalystId !== psychoanalyst.id) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  const body = await req.json();
  const { analysandRecordId } = body;
  if (!analysandRecordId) {
    return NextResponse.json({ error: "analysandRecordId required" }, { status: 400 });
  }

  const record = await db.analysandRecord.findUnique({ where: { id: analysandRecordId } });
  if (!record || record.psychoanalystId !== psychoanalyst.id) {
    return NextResponse.json({ error: "Analysand not found" }, { status: 404 });
  }

  const result = await shareResourceWithAnalysand(resource, analysandRecordId, psychoanalyst.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, documentId: result.documentId, reused: result.reused });
}
