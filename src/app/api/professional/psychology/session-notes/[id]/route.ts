import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { buildSessionNotePayload, type SessionFormat } from "@/lib/psychology-templates";
import { parsePsychologyContent, requirePsychologist, safeDecrypt } from "@/lib/psychology-api";

const patchSchema = z.object({
  format: z.enum(["DAP", "BIRP", "SOAP", "FREE"]),
  fields: z.record(z.string(), z.string()),
  sessionDurationMins: z.number().int().min(1).max(300).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePsychologist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { professional } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const document = await db.medicalDocument.findUnique({
    where: { id: params.id },
    select: { id: true, professionalId: true, content: true, sourceDocumentId: true },
  });
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (document.professionalId !== professional.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (document.sourceDocumentId)
    return NextResponse.json({ error: "Shared records cannot be edited" }, { status: 403 });

  const existing = parsePsychologyContent(safeDecrypt(document.content));
  if (!existing?.psychologyNote)
    return NextResponse.json({ error: "Not a session note" }, { status: 400 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const payload = buildSessionNotePayload(
    d.format,
    d.fields,
    d.sessionDurationMins,
    typeof existing.appointmentId === "string" ? existing.appointmentId : undefined,
  );

  const updated = await db.medicalDocument.update({
    where: { id: params.id },
    data: { content: encrypt(JSON.stringify(payload)) },
    include: {
      patientRecord: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({
    id: updated.id,
    title: safeDecrypt(updated.title),
    format: d.format,
    fields: d.fields,
    sessionDurationMins: d.sessionDurationMins ?? null,
    renderedBody: payload.renderedBody,
    createdAt: updated.createdAt.toISOString(),
    patientRecordId: updated.patientRecordId,
    patientName: updated.patientRecord
      ? `${safeDecrypt(updated.patientRecord.firstName)} ${safeDecrypt(updated.patientRecord.lastName)}`.trim()
      : "?",
    signatureStatus: updated.signatureStatus,
    signedAt: updated.signedAt?.toISOString() ?? null,
  });
}
