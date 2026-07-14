import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { generateClinicalSummary } from "@/lib/ai-summarize";
import { downloadFromS3 } from "@/lib/s3";
import { normalizeLang, type Lang } from "@/lib/i18n/translations";
import {
  requireLibraryAuth,
  resourceOwnerWhere,
  safeDecryptResource,
} from "@/lib/professional-library";

const schema = z.object({
  resourceId: z.string(),
  lang: z.enum(["pt", "en", "es"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireLibraryAuth();
    if (!ctx.ok) return ctx.error;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { language: true },
    });
    const lang: Lang = normalizeLang(parsed.data.lang || user?.language);

    const resource = await db.resource.findFirst({
      where: {
        id: parsed.data.resourceId,
        ...resourceOwnerWhere(ctx.owner),
        active: true,
      },
    });
    if (!resource) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const title = safeDecryptResource(resource.title);
    const content = resource.content ? safeDecryptResource(resource.content) : null;
    const url = resource.url;
    let fileKey: string | null = null;
    if (resource.fileUrl) {
      try {
        fileKey = decrypt(resource.fileUrl);
      } catch {
        fileKey = resource.fileUrl;
      }
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
        console.error("[LIBRARY-AI-SUMMARIZE] file download:", e);
      }
    }

    const summary = await generateClinicalSummary({
      lang,
      title: title || "Recurso",
      content,
      category: "Biblioteca",
      url,
      patientName: null,
      hasFile: !!fileKey,
      file,
    });

    return NextResponse.json({ summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "AI_NOT_CONFIGURED") {
      return NextResponse.json({ error: "AI_NOT_CONFIGURED" }, { status: 503 });
    }
    console.error("[LIBRARY-AI-SUMMARIZE]", e);
    return NextResponse.json({ error: "AI_FAILED" }, { status: 500 });
  }
}
