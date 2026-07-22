// POST — create a clinical dossier bundling a report with related exams (CTO E9).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { canEditChart, resolveChartAccess } from "@/lib/chart-access";

const schema = z.object({
  patientRecordId: z.string().min(1),
  primaryDocumentId: z.string().min(1),
  documentIds: z.array(z.string().min(1)).max(40),
  title: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { patientRecordId, primaryDocumentId, documentIds, title } = parsed.data;
  const access = await resolveChartAccess(ctx.professional.id, patientRecordId);
  if (!canEditChart(access)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const uniqueIds = Array.from(new Set([primaryDocumentId, ...documentIds]));
  const docs = await db.medicalDocument.findMany({
    where: {
      id: { in: uniqueIds },
      deletedAt: null,
      OR: [
        { professionalId: ctx.professional.id },
        { patientRecordId },
      ],
    },
    select: { id: true },
  });
  if (!docs.some((d) => d.id === primaryDocumentId)) {
    return NextResponse.json({ error: "Primary document not found" }, { status: 404 });
  }

  const allowed = new Set(docs.map((d) => d.id));
  const itemIds = uniqueIds.filter((id) => allowed.has(id));

  const dossier = await db.$transaction(async (tx) => {
    const created = await tx.documentDossier.create({
      data: {
        professionalId: ctx.professional.id,
        patientRecordId,
        title: title || null,
      },
    });

    await tx.documentDossierItem.createMany({
      data: itemIds.map((documentId, i) => ({
        dossierId: created.id,
        documentId,
        sortOrder: i,
      })),
    });

    await tx.medicalDocument.updateMany({
      where: { id: { in: itemIds } },
      data: { dossierId: created.id },
    });

    return created;
  });

  return NextResponse.json({ id: dossier.id, documentIds: itemIds });
}
