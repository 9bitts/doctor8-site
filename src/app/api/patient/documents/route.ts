// src/app/api/patient/documents/route.ts
// POST — patient uploads their OWN document (title + category + optional file key)
// GET  — returns a signed URL to view a file the patient is allowed to see (?documentId=...)
//        (the patient may only view files from their own docs or records shared with them)
//
// Phase 4B: POST now accepts categoryId (dynamic categories). We store categoryId
// AND derive the legacy `type` enum from the category's legacyType (Option 1: coexist).
import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { getSignedReadUrl } from "@/lib/s3";
import { z } from "zod";

const DOC_TYPES = [
  "PRESCRIPTION",
  "EXAM_REQUEST",
  "EXAM_RESULT",
  "CERTIFICATE",
  "REFERRAL",
  "CLINICAL_NOTE",
  "OTHER",
] as const;

type DocType = (typeof DOC_TYPES)[number];

const createSchema = z.object({
  categoryId: z.string().optional(),
  type: z.enum(DOC_TYPES).optional(),
  title: z.string().min(1).max(200),
  content: z.string().max(20000).optional().or(z.literal("")),
  fileKey: z.string().optional().or(z.literal("")),
});

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

function normalizeType(v: string | null | undefined): DocType {
  if (v && (DOC_TYPES as readonly string[]).includes(v)) return v as DocType;
  return "OTHER";
}

export async function POST(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId, patientProfileId } = ctx;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  // Guard against fileKey injection: a patient may only attach a file they just
  // uploaded to their own scoped folder (patient-docs/<userId>/...). This blocks
  // referencing another user's S3 object and reading it back via GET.
  if (d.fileKey) {
    const ownPrefix = `patient-docs/${userId.replace(/[^a-zA-Z0-9_-]/g, "")}/`;
    if (!d.fileKey.startsWith(ownPrefix)) {
      return NextResponse.json({ error: "Invalid file reference" }, { status: 400 });
    }
  }

  // Resolve the category (if provided) and derive the legacy enum type.
  let categoryId: string | null = null;
  let categoryName: string | null = null;
  let derivedType: DocType = normalizeType(d.type);

  if (d.categoryId) {
    const category = await db.category.findUnique({
      where: { id: d.categoryId },
      select: { id: true, name: true, legacyType: true, active: true },
    });
    if (!category || !category.active) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    categoryId = category.id;
    categoryName = category.name;
    derivedType = normalizeType(category.legacyType);
  }

  // Patient's own document: patientId = me, professionalId = null (so no "shared" tag)
  const doc = await db.medicalDocument.create({
    data: {
      patientId: patientProfileId,
      categoryId,
      type: derivedType,
      title: encrypt(d.title),
      content: d.content ? encrypt(d.content) : null,
      fileUrl: d.fileKey ? encrypt(d.fileKey) : null,
    },
  });

  return NextResponse.json({
    id: doc.id,
    type: doc.type,
    categoryId,
    categoryName,
    title: d.title,
    content: d.content || null,
    hasFile: !!d.fileKey,
    createdAt: doc.createdAt,
    sharedBy: null,
  }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId, patientProfileId } = ctx;

  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("documentId");
  if (!documentId) return NextResponse.json({ error: "Missing documentId" }, { status: 400 });

  // Load the document and verify the patient is allowed to see it:
  //  - it's their own (patientId = me), OR
  //  - it was shared with them (SharedRecord with sharedWithUserId = me)
  const doc = await db.medicalDocument.findUnique({
    where: { id: documentId },
    include: { sharedRecords: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwn = doc.patientId === patientProfileId;
  const isShared = doc.sharedRecords.some((s) => s.sharedWithUserId === userId);
  if (!isOwn && !isShared) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!doc.fileUrl) return NextResponse.json({ error: "No file" }, { status: 404 });

  const key = safeDecrypt(doc.fileUrl);
  const url = await getSignedReadUrl(key);
  return NextResponse.json({ url });
}
