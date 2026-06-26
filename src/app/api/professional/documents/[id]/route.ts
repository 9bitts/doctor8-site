// PATCH — update a clinical record created by this professional (not shared copies).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { z } from "zod";
import { serializeRecordContent, parseRecordContent, countRecordAttachments } from "@/lib/record-content";

const patchSchema = z.object({
  categoryId: z.string().optional(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(20000).optional().or(z.literal("")),
  cid: z.string().max(50).optional().or(z.literal("")),
  cidLabel: z.string().max(500).optional().or(z.literal("")),
  fileKey: z.string().optional().or(z.literal("")),
  appendFileKeys: z.array(z.string().min(1)).optional(),
  removeFile: z.boolean().optional(),
  recordKind: z.enum(["ANAMNESIS", "EVOLUTION", "REPORT", "OTHER"]).optional(),
});

function collectFileKeys(fileUrl: string | null, contentRaw: string): string[] {
  const keys: string[] = [];
  const primary = fileUrl ? safeDecrypt(fileUrl) : "";
  if (primary) keys.push(primary);
  const parsed = parseRecordContent(contentRaw || null);
  for (const k of parsed.attachments || []) {
    if (k && !keys.includes(k)) keys.push(k);
  }
  return keys;
}

function safeDecrypt(v: string): string {
  try { return decrypt(v); } catch { return v; }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const document = await db.medicalDocument.findUnique({
    where: { id: params.id },
    include: {
      patientRecord: { select: { professionalId: true } },
      category: { select: { name: true, groupName: true } },
    },
  });

  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (document.sourceDocumentId) {
    return NextResponse.json({ error: "Shared records cannot be edited" }, { status: 403 });
  }
  if (document.professionalId !== professional.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const updateData: {
    title?: string;
    content?: string | null;
    categoryId?: string | null;
    fileUrl?: string | null;
    recordKind?: "ANAMNESIS" | "EVOLUTION" | "REPORT" | "OTHER";
  } = {};

  if (d.categoryId) {
    const category = await db.category.findUnique({
      where: { id: d.categoryId },
      select: { id: true, active: true },
    });
    if (!category || !category.active) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    updateData.categoryId = category.id;
  }

  if (d.title) updateData.title = encrypt(d.title);
  if (d.recordKind) updateData.recordKind = d.recordKind;

  const existingRaw = document.content ? safeDecrypt(document.content) : "";
  let attachmentKeys = collectFileKeys(document.fileUrl, existingRaw);

  if (d.removeFile) {
    attachmentKeys = [];
    updateData.fileUrl = null;
  } else {
    const toAppend = [
      ...(d.appendFileKeys || []),
      ...(d.fileKey && !d.appendFileKeys?.length ? [d.fileKey] : []),
    ];
    for (const k of toAppend) {
      if (!attachmentKeys.includes(k)) attachmentKeys.push(k);
    }
    if (toAppend.length > 0) {
      updateData.fileUrl = attachmentKeys.length > 0 ? encrypt(attachmentKeys[0]) : null;
    }
  }

  const touchesContent =
    d.content !== undefined
    || d.cid !== undefined
    || d.cidLabel !== undefined
    || (d.appendFileKeys?.length ?? 0) > 0
    || !!d.fileKey
    || d.removeFile;

  if (touchesContent) {
    let bodyText = d.content ?? "";
    let cid = d.cid ?? "";
    let cidLabel = d.cidLabel ?? "";

    if (d.content === undefined || d.cid === undefined || d.cidLabel === undefined) {
      try {
        const prev = JSON.parse(existingRaw);
        if (prev && typeof prev === "object" && !Array.isArray(prev.items)) {
          if (d.content === undefined) bodyText = prev.body || "";
          if (d.cid === undefined) cid = prev.cid || "";
          if (d.cidLabel === undefined) cidLabel = prev.cidLabel || "";
        } else if (d.content === undefined) {
          bodyText = existingRaw;
        }
      } catch {
        if (d.content === undefined) bodyText = existingRaw;
      }
    }

    const serialized = serializeRecordContent({
      cid,
      cidLabel,
      body: bodyText,
      attachments: attachmentKeys.length > 0 ? attachmentKeys : undefined,
    });
    updateData.content = serialized ? encrypt(serialized) : null;
  }

  const updated = await db.medicalDocument.update({
    where: { id: params.id },
    data: updateData,
    include: { category: { select: { name: true, groupName: true } } },
  });

  const contentRaw = updated.content ? safeDecrypt(updated.content) : null;
  const finalCount = countRecordAttachments(!!updated.fileUrl, contentRaw);

  return NextResponse.json({
    id: updated.id,
    type: updated.type,
    recordKind: updated.recordKind,
    categoryName: updated.category?.name ?? null,
    categoryGroup: updated.category?.groupName ?? null,
    title: safeDecrypt(updated.title),
    content: contentRaw,
    hasFile: finalCount > 0,
    attachmentCount: finalCount,
    createdAt: updated.createdAt.toISOString(),
    canEdit: true,
    sourceDocumentId: null,
  });
}
