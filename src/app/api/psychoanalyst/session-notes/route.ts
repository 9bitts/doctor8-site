import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePsychoanalyst, safeDecrypt } from "@/lib/psychoanalyst-api";
import { savePsychoanalystSessionNote } from "@/lib/save-psychoanalyst-session-note";

const noteSchema = z.object({
  analysandRecordId: z.string(),
  content: z.string().min(1),
  appointmentId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { psychoanalyst } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const analysandId = req.nextUrl.searchParams.get("analysandId");

  const docs = await db.medicalDocument.findMany({
    where: {
      psychoanalystId: psychoanalyst.id,
      type: "CLINICAL_NOTE",
      analysandRecordId: analysandId || undefined,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      analysandRecord: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const notes = docs.map((d) => {
    let body = "";
    try {
      const parsed = JSON.parse(safeDecrypt(d.content));
      body = parsed.body || parsed.renderedBody || safeDecrypt(d.content);
    } catch {
      body = safeDecrypt(d.content);
    }
    return {
      id: d.id,
      title: safeDecrypt(d.title),
      body,
      createdAt: d.createdAt.toISOString(),
      analysandRecordId: d.analysandRecordId,
      analysandName: d.analysandRecord
        ? `${safeDecrypt(d.analysandRecord.firstName)} ${safeDecrypt(d.analysandRecord.lastName)}`.trim()
        : "?",
      shared: false,
    };
  });

  return NextResponse.json({ notes });
}

export async function POST(req: NextRequest) {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { psychoanalyst } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const body = await req.json();
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const record = await db.analysandRecord.findUnique({ where: { id: d.analysandRecordId } });
  if (!record || record.psychoanalystId !== psychoanalyst.id) {
    return NextResponse.json({ error: "Analysand not found" }, { status: 404 });
  }

  const doc = await savePsychoanalystSessionNote({
    psychoanalystId: psychoanalyst.id,
    analysandRecordId: d.analysandRecordId,
    content: d.content,
    appointmentId: d.appointmentId,
  });

  return NextResponse.json({
    id: doc.id,
    title: `Sess\u00e3o \u2014 ${new Date(doc.createdAt).toLocaleDateString("pt-BR")}`,
    body: d.content,
    createdAt: doc.createdAt.toISOString(),
  }, { status: 201 });
}
