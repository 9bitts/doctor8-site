import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfessional } from "@/lib/psychology-api";
import { db } from "@/lib/db";
import { resolveDocumentTemplate } from "@/lib/template-context";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  documentType: z.enum([
    "CERTIFICATE", "REFERRAL", "CLINICAL_NOTE", "OTHER",
  ]),
  title: z.string().min(1).max(300),
  body: z.string().min(1).max(50000),
});

export async function GET(req: NextRequest) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const patientRecordId = req.nextUrl.searchParams.get("patientRecordId");
  const previewId = req.nextUrl.searchParams.get("previewId");
  const locale = req.nextUrl.searchParams.get("locale") || "pt-BR";

  const templates = await db.documentTemplate.findMany({
    where: { professionalId: professional.id },
    orderBy: { updatedAt: "desc" },
  });

  if (previewId) {
    const tpl = templates.find((t) => t.id === previewId);
    if (!tpl) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    const resolved = await resolveDocumentTemplate(
      professional.id,
      { title: tpl.title, body: tpl.body },
      patientRecordId,
      locale,
    );
    return NextResponse.json({ preview: resolved });
  }

  return NextResponse.json({
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      documentType: t.documentType,
      title: t.title,
      body: t.body,
      updatedAt: t.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const tpl = await db.documentTemplate.create({
    data: {
      professionalId: professional.id,
      name: parsed.data.name,
      documentType: parsed.data.documentType,
      title: parsed.data.title,
      body: parsed.data.body,
    },
  });

  return NextResponse.json({
    id: tpl.id,
    name: tpl.name,
    documentType: tpl.documentType,
    title: tpl.title,
    body: tpl.body,
  }, { status: 201 });
}
