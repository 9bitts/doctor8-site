import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireIntegrativeTherapist, safeDecrypt } from "@/lib/integrative-therapist-api";
import { saveIntegrativeSessionNote } from "@/lib/save-integrative-session-note";
import { parseIntegrativeNoteContent, structuredValuesHaveContent } from "@/lib/pics/consult-templates";
import { normalizeLang } from "@/lib/i18n/translations";

const noteSchema = z
  .object({
    integrativeClientRecordId: z.string(),
    content: z.string().optional(),
    practiceSlug: z.string().optional(),
    appointmentId: z.string().optional(),
    visitType: z.enum(["first", "return"]).optional(),
    lang: z.enum(["pt", "en", "es"]).optional(),
    structured: z.record(z.union([z.string(), z.boolean()])).optional(),
  })
  .refine(
    (d) =>
      (d.content && d.content.trim().length > 0)
      || (d.structured && structuredValuesHaveContent(d.structured)),
    { message: "content or structured required" },
  );

export async function GET(req: NextRequest) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const clientId = req.nextUrl.searchParams.get("clientId");

  const docs = await db.medicalDocument.findMany({
    where: {
      integrativeTherapistId: therapist.id,
      type: "CLINICAL_NOTE",
      integrativeClientRecordId: clientId || undefined,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      integrativeClientRecord: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const notes = docs.map((d) => {
    const parsed = parseIntegrativeNoteContent(safeDecrypt(d.content));
    return {
      id: d.id,
      title: safeDecrypt(d.title),
      body: parsed.body,
      practiceSlug: parsed.practiceSlug,
      format: parsed.format,
      visitType: parsed.visitType,
      createdAt: d.createdAt.toISOString(),
      integrativeClientRecordId: d.integrativeClientRecordId,
      clientName: d.integrativeClientRecord
        ? `${safeDecrypt(d.integrativeClientRecord.firstName)} ${safeDecrypt(d.integrativeClientRecord.lastName)}`.trim()
        : "?",
    };
  });

  return NextResponse.json({ notes });
}

export async function POST(req: NextRequest) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const body = await req.json();
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const record = await db.integrativeClientRecord.findUnique({
    where: { id: d.integrativeClientRecordId },
  });
  if (!record || record.integrativeTherapistId !== therapist.id) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const user = await db.user.findUnique({
    where: { id: therapist.userId },
    select: { language: true },
  });
  const lang = normalizeLang(d.lang || user?.language);

  let doc;
  try {
    doc = await saveIntegrativeSessionNote({
      integrativeTherapistId: therapist.id,
      integrativeClientRecordId: d.integrativeClientRecordId,
      content: d.content,
      practiceSlug: d.practiceSlug ?? record.mainPractice,
      appointmentId: d.appointmentId,
      structured: d.structured,
      visitType: d.visitType,
      lang,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "EMPTY_NOTE") {
      return NextResponse.json({ error: "Empty note" }, { status: 400 });
    }
    throw e;
  }

  const savedBody = d.content?.trim() || "(structured)";

  return NextResponse.json(
    {
      id: doc.id,
      title: `Sess\u00e3o \u2014 ${new Date(doc.createdAt).toLocaleDateString("pt-BR")}`,
      body: savedBody,
      createdAt: doc.createdAt.toISOString(),
    },
    { status: 201 },
  );
}
