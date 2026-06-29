// src/app/api/professional/shared/[id]/attach/route.ts
// POST — attach a document a patient shared (param id = documentId) into an
// EXISTING chart of this professional. Copies the document into the chart and
// records sourceDocumentId to prevent duplicates.
import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
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

  // 1) The document must have been shared with THIS professional.
  const share = await db.sharedRecord.findFirst({
    where: { documentId, sharedWithProfessionalId: ctx.professional.id },
    select: { id: true },
  });
  if (!share) return NextResponse.json({ error: "Not shared with you" }, { status: 403 });

  // 2) The chart must belong to this professional.
  const chart = await db.patientRecord.findUnique({
    where: { id: chartId },
    select: { id: true, professionalId: true },
  });
  if (!chart || chart.professionalId !== ctx.professional.id) {
    return NextResponse.json({ error: "Chart not found" }, { status: 404 });
  }

  // 3) Prevent duplicate: already attached this source doc to this chart?
  const dup = await db.medicalDocument.findFirst({
    where: { patientRecordId: chartId, sourceDocumentId: documentId },
    select: { id: true },
  });
  if (dup) {
    return NextResponse.json({ attached: true, alreadyAttached: true, recordId: dup.id });
  }

  // 4) Copy the original into the chart.
  const original = await db.medicalDocument.findUnique({
    where: { id: documentId },
    select: { type: true, categoryId: true, title: true, content: true, fileUrl: true },
  });
  if (!original) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const copy = await db.medicalDocument.create({
    data: {
      patientRecordId: chartId,
      professionalId: ctx.professional.id,
      type: original.type,
      categoryId: original.categoryId,
      title: original.title,     // already encrypted
      content: original.content, // already encrypted (or null)
      fileUrl: original.fileUrl, // already encrypted S3 key (or null)
      sourceDocumentId: documentId,
    },
  });

  return NextResponse.json({ attached: true, recordId: copy.id });
}
