// POST — AI summary of a document or library resource for the logged-in professional.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { generateClinicalSummary } from "@/lib/ai-summarize";
import { downloadFromS3 } from "@/lib/s3";
import { normalizeLang, Lang } from "@/lib/i18n/translations";
import { formatRecordContentForDisplay } from "@/lib/record-content";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

const schema = z.object({
  documentId: z.string().optional(),
  resourceId: z.string().optional(),
  /** Analyze an uploaded exam/file before the document is saved (report editor). */
  fileKey: z.string().min(1).optional(),
  text: z.string().max(20000).optional(),
  title: z.string().max(200).optional(),
  lang: z.enum(["pt", "en", "es"]).optional(),
}).refine((d) => d.documentId || d.resourceId || d.fileKey || (d.text && d.text.trim()), {
  message: "documentId, resourceId, fileKey, or text required",
});

async function canAccessDocument(professionalId: string, documentId: string) {
  const doc = await db.medicalDocument.findUnique({
    where: { id: documentId },
    include: {
      category: { select: { name: true } },
      patientRecord: { select: { professionalId: true, firstName: true, lastName: true } },
      patient: { select: { firstName: true, lastName: true } },
    },
  });
  if (!doc) return null;

  if (doc.professionalId === professionalId) return doc;
  if (doc.patientRecord?.professionalId === professionalId) return doc;

  const share = await db.sharedRecord.findFirst({
    where: {
      documentId,
      sharedWithProfessionalId: professionalId,
      heldUntilLinkAccepted: false,
      revokedAt: null,
    },
  });
  if (share) return doc;

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

    
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { language: true },
    });
    const lang: Lang = normalizeLang(parsed.data.lang || user?.language);

    let title = "";
    let content: string | null = null;
    let category: string | null = null;
    let url: string | null = null;
    let patientName: string | null = null;
    let fileKey: string | null = null;

    if (parsed.data.documentId) {
      const doc = await canAccessDocument(ctx.professional.id, parsed.data.documentId);
      if (!doc || doc.deletedAt) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      title = safeDecrypt(doc.title);
      const contentRaw = doc.content ? safeDecrypt(doc.content) : null;
      content = contentRaw ? formatRecordContentForDisplay(contentRaw) : null;
      category = doc.category?.name ?? doc.type ?? null;
      if (doc.patientRecord) {
        patientName = `${safeDecrypt(doc.patientRecord.firstName)} ${safeDecrypt(doc.patientRecord.lastName)}`.trim();
      } else if (doc.patient) {
        patientName = `${safeDecrypt(doc.patient.firstName)} ${safeDecrypt(doc.patient.lastName)}`.trim();
      }
      if (doc.fileUrl) fileKey = safeDecrypt(doc.fileUrl);

      // Attached copies may have empty content — fall back to the original shared document.
      if (doc.sourceDocumentId && !content && !fileKey) {
        const source = await db.medicalDocument.findUnique({
          where: { id: doc.sourceDocumentId },
          select: { title: true, content: true, fileUrl: true, category: { select: { name: true } }, type: true },
        });
        if (source) {
          if (!title) title = safeDecrypt(source.title);
          const sourceRaw = source.content ? safeDecrypt(source.content) : null;
          content = sourceRaw ? formatRecordContentForDisplay(sourceRaw) : content;
          category = category ?? source.category?.name ?? source.type ?? null;
          if (source.fileUrl) fileKey = safeDecrypt(source.fileUrl);
        }
      }
    } else if (parsed.data.resourceId) {
      const resource = await db.resource.findFirst({
        where: { id: parsed.data.resourceId, professionalId: ctx.professional.id, active: true },
      });
      if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });

      title = safeDecrypt(resource.title);
      content = resource.content ? safeDecrypt(resource.content) : null;
      url = resource.url;
      category = "Biblioteca";
      if (resource.fileUrl) fileKey = safeDecrypt(resource.fileUrl);
    } else {
      // Direct text / file analysis from the report editor (CTO E2/E3)
      title = parsed.data.title?.trim() || "Anexo / texto";
      content = parsed.data.text?.trim() || null;
      fileKey = parsed.data.fileKey || null;
      category = "Análise";
    }

    if (!title && !content && !fileKey && !url) {
      return NextResponse.json({ error: "NO_CONTENT" }, { status: 400 });
    }

    let file: { body: Buffer; contentType?: string; fileName?: string } | null = null;
    if (fileKey) {
      try {
        const downloaded = await downloadFromS3(fileKey);
        file = { body: downloaded.body, contentType: downloaded.contentType, fileName: fileKey };
      } catch (e) {
        console.error("[AI-SUMMARIZE] file download:", e);
      }
    }

    const summary = await generateClinicalSummary({
      lang,
      title: title || "Documento",
      content,
      category,
      url,
      patientName,
      hasFile: !!fileKey,
      file,
    });

    return NextResponse.json({ summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "AI_NOT_CONFIGURED") {
      return NextResponse.json({ error: "AI_NOT_CONFIGURED" }, { status: 503 });
    }
    console.error("[AI-SUMMARIZE]", e);
    return NextResponse.json({ error: "AI_FAILED" }, { status: 500 });
  }
}
