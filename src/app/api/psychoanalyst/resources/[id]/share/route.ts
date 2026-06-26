// POST ? share a resource with an analysand

import { NextRequest, NextResponse } from "next/server";
import { encrypt, decrypt } from "@/lib/encryption";
import { requirePsychoanalyst } from "@/lib/psychoanalyst-api";
import { db } from "@/lib/db";

function safeDecrypt(v: string | null): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { psychoanalyst } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const resource = await db.resource.findUnique({ where: { id: params.id } });
  if (!resource || resource.psychoanalystId !== psychoanalyst.id) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  const body = await req.json();
  const { analysandRecordId } = body;
  if (!analysandRecordId) {
    return NextResponse.json({ error: "analysandRecordId required" }, { status: 400 });
  }

  const record = await db.analysandRecord.findUnique({ where: { id: analysandRecordId } });
  if (!record || record.psychoanalystId !== psychoanalyst.id) {
    return NextResponse.json({ error: "Analysand not found" }, { status: 404 });
  }

  await db.analysandResourceShare.upsert({
    where: {
      resourceId_analysandRecordId: { resourceId: params.id, analysandRecordId },
    },
    create: { resourceId: params.id, analysandRecordId },
    update: { sharedAt: new Date() },
  });

  const title = safeDecrypt(resource.title);
  const docContent = [
    safeDecrypt(resource.content ?? null),
    resource.url ? `Link: ${resource.url}` : "",
  ].filter(Boolean).join("\n\n");

  const doc = await db.medicalDocument.create({
    data: {
      analysandRecordId,
      psychoanalystId: psychoanalyst.id,
      type: "OTHER",
      title:   encrypt(title),
      content: docContent ? encrypt(docContent) : null,
      fileUrl: resource.fileUrl ?? null,
    },
  });

  if (record.linkedUserId) {
    await db.notification.create({
      data: {
        userId: record.linkedUserId,
        type:   "DOCUMENT_SHARED",
        title:  "Novo recurso compartilhado",
        body:   `Seu psicanalista compartilhou um recurso: ${title}`,
        data:   JSON.stringify({
          documentId: doc.id,
          titleKey: "notif.newResource.title",
          bodyKey: "notif.newResource.body",
          bodyParams: { title },
        }),
      },
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, documentId: doc.id });
}
