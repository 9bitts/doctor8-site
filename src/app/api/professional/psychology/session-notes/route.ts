import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { buildSessionNotePayload, type SessionFormat } from "@/lib/psychology-templates";
import { parsePsychologyContent, requirePsychologist, safeDecrypt } from "@/lib/psychology-api";

const createSchema = z.object({
  patientRecordId: z.string(),
  format: z.enum(["DAP", "BIRP", "SOAP", "FREE"]),
  fields: z.record(z.string(), z.string()),
  sessionDurationMins: z.number().int().min(1).max(300).optional(),
  appointmentId: z.string().optional(),
});

export async function GET() {
  const ctx = await requirePsychologist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { professional } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const docs = await db.medicalDocument.findMany({
    where: {
      professionalId: professional.id,
      type: "CLINICAL_NOTE",
      patientRecordId: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      patientRecord: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const notes = docs
    .map((d) => {
      const content = parsePsychologyContent(safeDecrypt(d.content));
      if (!content?.psychologyNote) return null;
      return {
        id: d.id,
        title: safeDecrypt(d.title),
        format: content.format as SessionFormat,
        fields: content.fields as Record<string, string>,
        sessionDurationMins: content.sessionDurationMins as number | null,
        renderedBody: content.renderedBody as string,
        signatureStatus: d.signatureStatus,
        signedAt: d.signedAt?.toISOString() ?? null,
        createdAt: d.createdAt.toISOString(),
        patientRecordId: d.patientRecordId,
        patientName: d.patientRecord
          ? `${safeDecrypt(d.patientRecord.firstName)} ${safeDecrypt(d.patientRecord.lastName)}`.trim()
          : "—",
      };
    })
    .filter(Boolean);

  return NextResponse.json({ notes });
}

export async function POST(req: NextRequest) {
  const ctx = await requirePsychologist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { professional } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const record = await db.patientRecord.findUnique({ where: { id: d.patientRecordId } });
  if (!record || record.professionalId !== professional.id)
    return NextResponse.json({ error: "Chart not found" }, { status: 404 });

  const payload = buildSessionNotePayload(d.format, d.fields, d.sessionDurationMins, d.appointmentId);
  const title = `Sessão ${d.format} — ${new Date().toLocaleDateString("pt-BR")}`;

  const doc = await db.medicalDocument.create({
    data: {
      patientRecordId: d.patientRecordId,
      professionalId: professional.id,
      appointmentId: d.appointmentId || null,
      type: "CLINICAL_NOTE",
      title: encrypt(title),
      content: encrypt(JSON.stringify(payload)),
    },
  });

  return NextResponse.json({
    id: doc.id,
    title,
    format: d.format,
    fields: d.fields,
    renderedBody: payload.renderedBody,
    createdAt: doc.createdAt.toISOString(),
  }, { status: 201 });
}
