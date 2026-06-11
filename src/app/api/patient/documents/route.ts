// src/app/api/patient/documents/route.ts
// POST — patient uploads their OWN document (title + category + optional file key)
// GET  — returns a signed URL to view a file the patient is allowed to see (?key=...)
//        (the patient may only view files from their own docs or records shared with them)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { getSignedReadUrl } from "@/lib/s3";
import { z } from "zod";

const DOC_TYPES = [
  "EXAM_REQUEST",
  "EXAM_RESULT",
  "CERTIFICATE",
  "REFERRAL",
  "CLINICAL_NOTE",
  "OTHER",
] as const;

const createSchema = z.object({
  type: z.enum(DOC_TYPES),
  title: z.string().min(1).max(200),
  content: z.string().max(20000).optional().or(z.literal("")),
  fileKey: z.string().optional().or(z.literal("")),
});

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const patient = await db.patientProfile.findUnique({ where: { userId: session.user.id } });
  if (!patient) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  // Patient's own document: patientId = me, professionalId = null (so no "shared" tag)
  const doc = await db.medicalDocument.create({
    data: {
      patientId: patient.id,
      type: d.type,
      title: encrypt(d.title),
      content: d.content ? encrypt(d.content) : null,
      fileUrl: d.fileKey ? encrypt(d.fileKey) : null,
    },
  });

  return NextResponse.json({
    id: doc.id,
    type: doc.type,
    title: d.title,
    content: d.content || null,
    hasFile: !!d.fileKey,
    createdAt: doc.createdAt,
    sharedBy: null,
  }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const patient = await db.patientProfile.findUnique({ where: { userId: session.user.id } });
  if (!patient) return NextResponse.json({ error: "No profile" }, { status: 404 });

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

  const isOwn = doc.patientId === patient.id;
  const isShared = doc.sharedRecords.some((s) => s.sharedWithUserId === session.user.id);
  if (!isOwn && !isShared) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!doc.fileUrl) return NextResponse.json({ error: "No file" }, { status: 404 });

  const key = safeDecrypt(doc.fileUrl);
  const url = await getSignedReadUrl(key);
  return NextResponse.json({ url });
}
