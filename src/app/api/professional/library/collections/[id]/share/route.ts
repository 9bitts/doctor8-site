import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import {
  collectionOwnerWhere,
  requireLibraryAuth,
  resourceOwnerWhere,
  safeDecryptResource,
} from "@/lib/professional-library";

async function shareResourceWithPatient(
  resource: { id: string; title: string; content: string | null; url: string | null; fileUrl: string | null },
  patientRecordId: string,
  professionalId: string,
) {
  await db.resourceShare.upsert({
    where: { resourceId_patientRecordId: { resourceId: resource.id, patientRecordId } },
    create: { resourceId: resource.id, patientRecordId },
    update: { sharedAt: new Date() },
  });

  const title = safeDecryptResource(resource.title);
  const docContent = [
    safeDecryptResource(resource.content),
    resource.url ? `Link: ${resource.url}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const doc = await db.medicalDocument.create({
    data: {
      patientRecordId,
      professionalId,
      type: "OTHER",
      title: encrypt(title),
      content: docContent ? encrypt(docContent) : null,
      fileUrl: resource.fileUrl ?? null,
    },
  });

  const chart = await db.patientRecord.findUnique({ where: { id: patientRecordId } });
  if (chart?.linkedUserId) {
    await db.notification
      .create({
        data: {
          userId: chart.linkedUserId,
          type: "DOCUMENT_SHARED",
          title: "Novo recurso compartilhado",
          body: `O seu médico compartilhou um recurso: ${title}`,
          data: JSON.stringify({
            documentId: doc.id,
            titleKey: "notif.newResource.title",
            bodyKey: "notif.newResource.body",
            bodyParams: { title },
          }),
        },
      })
      .catch(() => {});
  }

  return doc.id;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireLibraryAuth();
  if (!ctx.ok) return ctx.error;

  if (ctx.owner.kind !== "health" || !ctx.owner.professionalId) {
    return NextResponse.json({ error: "Not supported for this provider type" }, { status: 400 });
  }

  const body = await req.json();
  const { patientRecordId } = body;
  if (!patientRecordId) {
    return NextResponse.json({ error: "patientRecordId required" }, { status: 400 });
  }

  const collection = await db.resourceCollection.findFirst({
    where: { id: params.id, ...collectionOwnerWhere(ctx.owner), active: true },
    include: { resources: { where: { active: true } } },
  });
  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  const chart = await db.patientRecord.findUnique({ where: { id: patientRecordId } });
  if (!chart || chart.professionalId !== ctx.owner.professionalId) {
    return NextResponse.json({ error: "Chart not found" }, { status: 404 });
  }

  const sharedIds: string[] = [];
  for (const resource of collection.resources) {
    const docId = await shareResourceWithPatient(resource, patientRecordId, ctx.owner.professionalId);
    sharedIds.push(docId);
  }

  return NextResponse.json({ ok: true, sharedCount: sharedIds.length, documentIds: sharedIds });
}
