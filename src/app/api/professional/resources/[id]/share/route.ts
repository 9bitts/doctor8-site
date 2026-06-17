// src/app/api/professional/resources/[id]/share/route.ts
// POST — share a resource with a patient (creates ResourceShare + MedicalDocument copy)
// DELETE — soft-delete the resource itself (called from [id]/route via parent)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";

function safeDecrypt(v: string | null): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

  // Verify resource belongs to this professional
  const resource = await db.resource.findUnique({
    where: { id: params.id },
  });
  if (!resource || resource.professionalId !== professional.id) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  const body = await req.json();
  const { patientRecordId } = body;
  if (!patientRecordId) {
    return NextResponse.json({ error: "patientRecordId required" }, { status: 400 });
  }

  // Verify chart belongs to this professional
  const chart = await db.patientRecord.findUnique({
    where: { id: patientRecordId },
    include: { linkedUser: { include: { patientProfile: true } } },
  });
  if (!chart || chart.professionalId !== professional.id) {
    return NextResponse.json({ error: "Chart not found" }, { status: 404 });
  }

  // Upsert ResourceShare (idempotent — sharing twice is fine)
  await db.resourceShare.upsert({
    where: { resourceId_patientRecordId: { resourceId: params.id, patientRecordId } },
    create: { resourceId: params.id, patientRecordId },
    update: { sharedAt: new Date() },
  });

  // Decrypted title for the document copy
  const title = safeDecrypt(resource.title);

  // Create a MedicalDocument copy so it shows in the patient's Documents tab
  // We use type OTHER and store the URL/content so the patient sees it
  const docTitle = title;
  const docContent = [
    safeDecrypt(resource.content ?? null),
    resource.url ? `Link: ${resource.url}` : "",
  ].filter(Boolean).join("\n\n");

  const doc = await db.medicalDocument.create({
    data: {
      patientRecordId,
      professionalId: professional.id,
      type: "OTHER",
      title:   encrypt(docTitle),
      content: docContent ? encrypt(docContent) : null,
      fileUrl: resource.fileUrl ?? null, // reuse same S3 key
    },
  });

  // Create notification for the patient (if they have an account)
  if (chart.linkedUserId) {
    await db.notification.create({
      data: {
        userId:  chart.linkedUserId,
        type:    "DOCUMENT_SHARED",
        title:   "Novo recurso compartilhado",
        message: `O seu médico compartilhou um recurso: ${title}`,
        data:    JSON.stringify({ documentId: doc.id }),
      },
    }).catch(() => {}); // non-fatal
  }

  return NextResponse.json({ ok: true, documentId: doc.id });
}
