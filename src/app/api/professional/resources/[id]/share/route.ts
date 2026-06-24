// src/app/api/professional/resources/[id]/share/route.ts
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

  const resource = await db.resource.findUnique({ where: { id: params.id } });
  if (!resource || resource.professionalId !== professional.id) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  const body = await req.json();
  const { patientRecordId } = body;
  if (!patientRecordId) {
    return NextResponse.json({ error: "patientRecordId required" }, { status: 400 });
  }

  const chart = await db.patientRecord.findUnique({ where: { id: patientRecordId } });
  if (!chart || chart.professionalId !== professional.id) {
    return NextResponse.json({ error: "Chart not found" }, { status: 404 });
  }

  await db.resourceShare.upsert({
    where: { resourceId_patientRecordId: { resourceId: params.id, patientRecordId } },
    create: { resourceId: params.id, patientRecordId },
    update: { sharedAt: new Date() },
  });

  const title = safeDecrypt(resource.title);
  const docContent = [
    safeDecrypt(resource.content ?? null),
    resource.url ? `Link: ${resource.url}` : "",
  ].filter(Boolean).join("\n\n");

  const doc = await db.medicalDocument.create({
    data: {
      patientRecordId,
      professionalId: professional.id,
      type: "OTHER",
      title:   encrypt(title),
      content: docContent ? encrypt(docContent) : null,
      fileUrl: resource.fileUrl ?? null,
    },
  });

  if (chart.linkedUserId) {
    await db.notification.create({
      data: {
        userId: chart.linkedUserId,
        type:   "DOCUMENT_SHARED",
        title:  "Novo recurso compartilhado",
        body:   `O seu médico compartilhou um recurso: ${title}`,
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