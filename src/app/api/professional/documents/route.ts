// src/app/api/professional/documents/route.ts
// POST — create a clinical record (MedicalDocument) attached to a PatientRecord.
// The file (if any) must already be uploaded via /api/uploads; we receive its key.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
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
  patientRecordId: z.string(),
  type: z.enum(DOC_TYPES),
  title: z.string().min(1).max(200),
  content: z.string().max(20000).optional().or(z.literal("")),
  fileKey: z.string().optional().or(z.literal("")), // S3 key from /api/uploads
});

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

  const doc = await db.medicalDocument.create({
    data: {
      patientRecordId: d.patientRecordId,
      professionalId: professional.id,
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
  }, { status: 201 });
}
