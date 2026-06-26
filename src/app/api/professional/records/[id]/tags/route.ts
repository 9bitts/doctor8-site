import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfessional } from "@/lib/psychology-api";
import { db } from "@/lib/db";

const createSchema = z.object({
  kind: z.enum(["ALLERGY", "MEDICATION", "PREGNANT", "OTHER"]),
  label: z.string().min(1).max(200),
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

  const tags = await db.patientRecordTag.findMany({
    where: { patientRecordId: record.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    tags: tags.map((t) => ({
      id: t.id,
      kind: t.kind,
      label: t.label,
      createdAt: t.createdAt.toISOString(),
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

  const tag = await db.patientRecordTag.create({
    data: {
      patientRecordId: record.id,
      kind: parsed.data.kind,
      label: parsed.data.label.trim(),
    },
  });

  return NextResponse.json({
    id: tag.id,
    kind: tag.kind,
    label: tag.label,
    createdAt: tag.createdAt.toISOString(),
  }, { status: 201 });
}
