// PATCH — update a clinical record created by this professional (not shared copies).
// GET — fetch one issued document for reuse (exams, certificates, etc.).

import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { z } from "zod";
import { serializeRecordContent, parseRecordContent, countRecordAttachments } from "@/lib/record-content";
import { canEditChart, resolveChartAccess } from "@/lib/chart-access";
import { isExamType, parseExamContent, safeDecrypt as signSafeDecrypt, serializeExamContent } from "@/lib/sign-helpers";

const patchSchema = z.object({
  categoryId: z.string().optional(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(20000).optional().or(z.literal("")),
  examItems: z.array(z.string().min(1).max(500)).optional(),
  notes: z.string().max(2000).optional().or(z.literal("")),
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

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const document = await db.medicalDocument.findFirst({
    where: {
      id: params.id,
      professionalId: ctx.professional.id,
    },
    include: {
      category: { select: { name: true } },
      patientRecord: { select: { id: true, firstName: true, lastName: true } },
      patient: { select: { firstName: true, lastName: true } },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const contentRaw = document.content ? safeDecrypt(document.content) : "";
  const exam = isExamType(document.type) ? parseExamContent(contentRaw) : null;

  let firstName = "";
  let lastName = "";
  if (document.patientRecord) {
    firstName = signSafeDecrypt(document.patientRecord.firstName);
    lastName = signSafeDecrypt(document.patientRecord.lastName);
  } else if (document.patient) {
    firstName = signSafeDecrypt(document.patient.firstName);
    lastName = signSafeDecrypt(document.patient.lastName);
  }

  return NextResponse.json({
    document: {
      id: document.id,
      type: document.type,
      categoryName: document.category?.name || null,
      title: safeDecrypt(document.title),
      content: isExamType(document.type) ? null : contentRaw,
      examItems: exam?.items || [],
      examNotes: exam?.notes || "",
      cid: exam?.cid || "",
      patientRecordId: document.patientRecordId,
      signatureStatus: document.signatureStatus,
      whatsappNotifyStatus: document.whatsappNotifyStatus,
      patientNotifiedAt: !!document.patientNotifiedAt,
      digitalSignature: document.digitalSignature,
      signed: document.signatureStatus === "SIGNED",
      createdAt: document.createdAt,
      document: {
        patient: firstName || lastName ? { firstName, lastName } : null,
      },
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const document = await db.medicalDocument.findUnique({
    where: { id: params.id },
    include: {
      patientRecord: { select: { id: true, professionalId: true } },
      category: { select: { name: true, groupName: true } },
    },
  });

  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (document.signatureStatus === "SIGNED") {
    return NextResponse.json({ error: "Signed documents cannot be edited" }, { status: 403 });
  }
  if (document.sourceDocumentId) {
    return NextResponse.json({ error: "Shared records cannot be edited" }, { status: 403 });
  }
  const recordId = document.patientRecord?.id;
  if (!recordId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const access = await resolveChartAccess(ctx.professional.id, recordId);
  if (!canEditChart(access)) {
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

  if (isExamType(document.type) && d.examItems) {
    const examExisting = parseExamContent(existingRaw);
    updateData.content = encrypt(serializeExamContent({
      items: d.examItems,
      notes: d.notes ?? examExisting.notes ?? "",
      cid: d.cid ?? examExisting.cid ?? "",
    }));
  } else if (touchesContent) {
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
