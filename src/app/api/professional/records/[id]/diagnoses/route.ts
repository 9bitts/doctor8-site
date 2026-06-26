import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfessional } from "@/lib/psychology-api";
import { db } from "@/lib/db";
import { upsertActiveDiagnosis } from "@/lib/clinical-diagnosis";

const createSchema = z.object({
  cidCode: z.string().min(1).max(20),
  cidLabel: z.string().max(500).optional(),
});

async function getOwnedRecord(professionalId: string, recordId: string) {
  return db.patientRecord.findFirst({
    where: { id: recordId, professionalId },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const record = await getOwnedRecord(professional.id, params.id);
  if (!record) return NextResponse.json({ error: "Chart not found" }, { status: 404 });

  const diagnoses = await db.patientDiagnosis.findMany({
    where: { patientRecordId: record.id },
    orderBy: [{ status: "asc" }, { notedAt: "desc" }],
  });

  return NextResponse.json({
    diagnoses: diagnoses.map((d) => ({
      id: d.id,
      cidCode: d.cidCode,
      cidLabel: d.cidLabel,
      status: d.status,
      notedAt: d.notedAt.toISOString(),
      resolvedAt: d.resolvedAt?.toISOString() ?? null,
      sourceDocumentId: d.sourceDocumentId,
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const record = await getOwnedRecord(professional.id, params.id);
  if (!record) return NextResponse.json({ error: "Chart not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const diag = await upsertActiveDiagnosis(
    record.id,
    parsed.data.cidCode,
    parsed.data.cidLabel,
  );

  return NextResponse.json({
    id: diag!.id,
    cidCode: diag!.cidCode,
    cidLabel: diag!.cidLabel,
    status: diag!.status,
    notedAt: diag!.notedAt.toISOString(),
    resolvedAt: diag!.resolvedAt?.toISOString() ?? null,
  }, { status: 201 });
}
