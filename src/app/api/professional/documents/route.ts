// src/app/api/professional/documents/route.ts
// POST — create a clinical record (MedicalDocument) attached to a PatientRecord.
// The file (if any) must already be uploaded via /api/uploads; we receive its key.
//
// Phase 4B: the form now sends categoryId (dynamic categories). We store the
// categoryId AND derive the legacy `type` enum from the category's legacyType,
// so older screens that still read `type` keep working (Option 1: coexist).
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
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
  patientRecordId: z.string(),
  categoryId: z.string().optional(),
  type: z.enum(DOC_TYPES).optional(),
  title: z.string().min(1).max(200),
  content: z.string().max(20000).optional().or(z.literal("")),
  fileKey: z.string().optional().or(z.literal("")),
  fileKeys: z.array(z.string().min(1)).optional(),
  examItems: z.array(z.string().min(1).max(500)).optional(),
  cid: z.string().max(50).optional(),
  cidLabel: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
});

function normalizeType(v: string | null | undefined): DocType {
  if (v && (DOC_TYPES as readonly string[]).includes(v)) return v as DocType;
  return "OTHER";
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  // Verify the chart belongs to this professional
  const record = await db.patientRecord.findUnique({ where: { id: d.patientRecordId } });
  if (!record || record.professionalId !== professional.id) {
    return NextResponse.json({ error: "Chart not found" }, { status: 404 });
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

  let contentToStore = d.content || "";
  const allKeys = d.fileKeys?.length ? d.fileKeys : (d.fileKey ? [d.fileKey] : []);
  const primaryKey = allKeys[0] || d.fileKey || "";

  if (d.cid || d.cidLabel || allKeys.length > 0) {
    contentToStore = JSON.stringify({
      cid: d.cid || "",
      cidLabel: d.cidLabel || "",
      body: d.content || "",
      ...(allKeys.length > 0 ? { attachments: allKeys } : {}),
    });
  } else if (d.examItems && d.examItems.length > 0) {
    derivedType = derivedType === "OTHER" ? "EXAM_REQUEST" : derivedType;
    contentToStore = JSON.stringify({
      items: d.examItems,
      notes: d.notes || "",
      cid: d.cid || "",
      cidLabel: d.cidLabel || "",
    });
  }

  try {
    const doc = await db.medicalDocument.create({
      data: {
        patientRecordId: d.patientRecordId,
        professionalId: professional.id,
        categoryId,
        type: derivedType,
        title: encrypt(d.title),
        content: contentToStore ? encrypt(contentToStore) : null,
        fileUrl: primaryKey ? encrypt(primaryKey) : null,
      },
    });

    return NextResponse.json({
      id: doc.id,
      type: doc.type,
      categoryId,
      categoryName,
      title: d.title,
      content: contentToStore || null,
      examItems: d.examItems || null,
      cid: d.cid || null,
      notes: d.notes || null,
      hasFile: allKeys.length > 0,
      attachmentCount: allKeys.length,
      createdAt: doc.createdAt,
    }, { status: 201 });
  } catch (err) {
    console.error("[documents POST]", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("ENCRYPTION_KEY")) {
      return NextResponse.json({ error: "Server configuration error. Contact support." }, { status: 500 });
    }
    return NextResponse.json({ error: "Could not save document. Try again." }, { status: 500 });
  }
}
