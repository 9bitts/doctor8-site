// src/app/api/professional/shared/[id]/attach/route.ts
// POST — attach a document a patient shared (param id = documentId) into an
// EXISTING chart of this professional. Copies the document into the chart and
// records sourceDocumentId to prevent duplicates.
import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { attachSharedDocumentToChart } from "@/lib/shared-document-attach";
import { z } from "zod";

const schema = z.object({
  chartId: z.string(), // PatientRecord.id to attach into
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const documentId = params.id;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { chartId } = parsed.data;

  const result = await attachSharedDocumentToChart({
    documentId,
    chartId,
    professionalId: ctx.professional.id,
  });

  if (!result) {
    return NextResponse.json({ error: "Not shared with you or chart not found" }, { status: 403 });
  }

  return NextResponse.json({
    attached: result.attached,
    alreadyAttached: result.alreadyAttached,
    recordId: result.recordId,
  });
}
