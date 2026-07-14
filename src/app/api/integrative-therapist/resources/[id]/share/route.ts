import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireIntegrativeTherapist } from "@/lib/integrative-therapist-api";
import { shareResourceWithIntegrativeClient } from "@/lib/professional-library/share-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const resource = await db.resource.findUnique({ where: { id: params.id } });
  if (!resource || resource.integrativeTherapistId !== therapist.id) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  const body = await req.json();
  const { integrativeClientRecordId } = body;
  if (!integrativeClientRecordId) {
    return NextResponse.json({ error: "integrativeClientRecordId required" }, { status: 400 });
  }

  const client = await db.integrativeClientRecord.findUnique({
    where: { id: integrativeClientRecordId },
  });
  if (!client || client.integrativeTherapistId !== therapist.id) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const result = await shareResourceWithIntegrativeClient(
    resource,
    integrativeClientRecordId,
    therapist.id,
  );
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, documentId: result.documentId, reused: result.reused });
}
