import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireIntegrativeTherapist, safeDecrypt } from "@/lib/integrative-therapist-api";
import { saveIntegrativeSessionNote } from "@/lib/save-integrative-session-note";

const noteSchema = z.object({
  integrativeClientRecordId: z.string(),
  content: z.string().min(1),
  practiceSlug: z.string().optional(),
  appointmentId: z.string().optional(),
});

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
    let body = "";
    let practiceSlug: string | null = null;
    try {
      const parsed = JSON.parse(safeDecrypt(d.content));
      body = parsed.body || parsed.renderedBody || safeDecrypt(d.content);
      practiceSlug = parsed.practiceSlug ?? null;
    } catch {
      body = safeDecrypt(d.content);
    }
    return {
      id: d.id,
      title: safeDecrypt(d.title),
      body,
      practiceSlug,
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

  const doc = await saveIntegrativeSessionNote({
    integrativeTherapistId: therapist.id,
    integrativeClientRecordId: d.integrativeClientRecordId,
    content: d.content,
    practiceSlug: d.practiceSlug ?? record.mainPractice,
    appointmentId: d.appointmentId,
  });

  return NextResponse.json(
    {
      id: doc.id,
      title: `Sess\u00e3o \u2014 ${new Date(doc.createdAt).toLocaleDateString("pt-BR")}`,
      body: d.content,
      createdAt: doc.createdAt.toISOString(),
    },
    { status: 201 },
  );
}
