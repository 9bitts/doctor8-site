import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfessional } from "@/lib/psychology-api";
import { db } from "@/lib/db";
import { resolveDocumentTemplate } from "@/lib/template-context";
import { isExamTemplateCategory, TEMPLATE_CATEGORIES } from "@/lib/clinical-template-utils";

const templateCategorySchema = z.enum([
  TEMPLATE_CATEGORIES.EXAM_CLINICAL,
  TEMPLATE_CATEGORIES.EXAM_PREOP,
  TEMPLATE_CATEGORIES.CERTIFICATE,
]);

const createSchema = z.object({
  name: z.string().min(1).max(120),
  documentType: z.enum([
    "EXAM_REQUEST", "CERTIFICATE", "REFERRAL", "CLINICAL_NOTE", "OTHER",
  ]),
  templateCategory: templateCategorySchema.optional(),
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
  const category = req.nextUrl.searchParams.get("category");

  const where: { professionalId: string; templateCategory?: string } = {
    professionalId: professional.id,
  };
  if (category) where.templateCategory = category;

  const templates = await db.documentTemplate.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });

  if (previewId) {
    const tpl = templates.find((t) => t.id === previewId)
      ?? await db.documentTemplate.findFirst({
        where: { id: previewId, professionalId: professional.id },
      });
    if (!tpl) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    if (isExamTemplateCategory(tpl.templateCategory)) {
      return NextResponse.json({
        template: {
          id: tpl.id,
          name: tpl.name,
          documentType: tpl.documentType,
          templateCategory: tpl.templateCategory,
          title: tpl.title,
          body: tpl.body,
        },
      });
    }

    const resolved = await resolveDocumentTemplate(
      professional.id,
      { title: tpl.title, body: tpl.body },
      patientRecordId,
      locale,
    );
    return NextResponse.json({
      preview: resolved,
      template: {
        id: tpl.id,
        name: tpl.name,
        documentType: tpl.documentType,
        templateCategory: tpl.templateCategory,
        title: tpl.title,
        body: tpl.body,
      },
    });
  }

  return NextResponse.json({
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      documentType: t.documentType,
      templateCategory: t.templateCategory,
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
      templateCategory: parsed.data.templateCategory || null,
      title: parsed.data.title,
      body: parsed.data.body,
    },
  });

  return NextResponse.json({
    id: tpl.id,
    name: tpl.name,
    documentType: tpl.documentType,
    templateCategory: tpl.templateCategory,
    title: tpl.title,
    body: tpl.body,
  }, { status: 201 });
}
