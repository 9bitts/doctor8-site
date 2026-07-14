import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  collectionOwnerWhere,
  requireLibraryAuth,
  shareResourceWithPatient,
} from "@/lib/professional-library";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireLibraryAuth();
  if (!ctx.ok) return ctx.error;

  if (ctx.owner.kind !== "health" || !ctx.owner.professionalId) {
    return NextResponse.json({ error: "Not supported for this provider type" }, { status: 400 });
  }

  const body = await req.json();
  const { patientRecordId } = body;
  if (!patientRecordId) {
    return NextResponse.json({ error: "patientRecordId required" }, { status: 400 });
  }

  const collection = await db.resourceCollection.findFirst({
    where: { id: params.id, ...collectionOwnerWhere(ctx.owner), active: true },
    include: { resources: { where: { active: true } } },
  });
  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  const chart = await db.patientRecord.findUnique({ where: { id: patientRecordId } });
  if (!chart || chart.professionalId !== ctx.owner.professionalId) {
    return NextResponse.json({ error: "Chart not found" }, { status: 404 });
  }

  const documentIds: string[] = [];
  for (const resource of collection.resources) {
    const result = await shareResourceWithPatient(
      resource,
      patientRecordId,
      ctx.owner.professionalId,
    );
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    if (result.documentId) documentIds.push(result.documentId);
  }

  return NextResponse.json({ ok: true, sharedCount: collection.resources.length, documentIds });
}
