// src/app/api/professional/resources/[id]/share/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { shareResourceWithPatient } from "@/lib/professional-library/share-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const resource = await db.resource.findUnique({ where: { id: params.id } });
  if (!resource || resource.professionalId !== ctx.professional.id) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  const body = await req.json();
  const { patientRecordId } = body;
  if (!patientRecordId) {
    return NextResponse.json({ error: "patientRecordId required" }, { status: 400 });
  }

  const chart = await db.patientRecord.findUnique({ where: { id: patientRecordId } });
  if (!chart || chart.professionalId !== ctx.professional.id) {
    return NextResponse.json({ error: "Chart not found" }, { status: 404 });
  }

  const result = await shareResourceWithPatient(resource, patientRecordId, ctx.professional.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, documentId: result.documentId, reused: result.reused });
}
