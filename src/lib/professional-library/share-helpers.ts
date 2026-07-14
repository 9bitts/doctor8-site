import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { safeDecryptResource } from "./auth";

type ResourceRow = {
  id: string;
  title: string;
  content: string | null;
  url: string | null;
  fileUrl: string | null;
  active?: boolean;
};

function buildDocContent(resource: ResourceRow): string {
  return [
    safeDecryptResource(resource.content),
    resource.url ? `Link: ${resource.url}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function notifyPatientShare(opts: {
  userId: string;
  title: string;
  documentId?: string;
  resourceId?: string;
  shareId?: string;
  bodyKey?: string;
}) {
  await db.notification
    .create({
      data: {
        userId: opts.userId,
        type: "DOCUMENT_SHARED",
        title: "Novo recurso compartilhado",
        body: `Novo recurso: ${opts.title}`,
        data: JSON.stringify({
          ...(opts.documentId ? { documentId: opts.documentId } : {}),
          ...(opts.resourceId ? { resourceId: opts.resourceId } : {}),
          ...(opts.shareId ? { shareId: opts.shareId } : {}),
          titleKey: "notif.newResource.title",
          bodyKey: opts.bodyKey ?? "notif.newResource.body",
          bodyParams: { title: opts.title },
        }),
      },
    })
    .catch(() => {});
}

/** Share library resource with a health patient chart. Skips duplicate medicalDocument on re-share. */
export async function shareResourceWithPatient(
  resource: ResourceRow,
  patientRecordId: string,
  professionalId: string,
) {
  if (resource.active === false) {
    return { error: "Resource inactive" as const, status: 400 };
  }

  const existing = await db.resourceShare.findUnique({
    where: { resourceId_patientRecordId: { resourceId: resource.id, patientRecordId } },
  });

  const title = safeDecryptResource(resource.title);

  if (existing) {
    await db.resourceShare.update({
      where: { id: existing.id },
      data: { sharedAt: new Date() },
    });
    return { ok: true as const, shareId: existing.id, documentId: null, reused: true };
  }

  const share = await db.resourceShare.create({
    data: { resourceId: resource.id, patientRecordId },
  });

  const docContent = buildDocContent(resource);
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
    await notifyPatientShare({
      userId: chart.linkedUserId,
      title,
      documentId: doc.id,
      resourceId: resource.id,
      shareId: share.id,
    });
  }

  return { ok: true as const, shareId: share.id, documentId: doc.id, reused: false };
}

/** Share library resource with an analysand chart. Skips duplicate medicalDocument on re-share. */
export async function shareResourceWithAnalysand(
  resource: ResourceRow,
  analysandRecordId: string,
  psychoanalystId: string,
) {
  if (resource.active === false) {
    return { error: "Resource inactive" as const, status: 400 };
  }

  const existing = await db.analysandResourceShare.findUnique({
    where: { resourceId_analysandRecordId: { resourceId: resource.id, analysandRecordId } },
  });

  const title = safeDecryptResource(resource.title);

  if (existing) {
    await db.analysandResourceShare.update({
      where: { id: existing.id },
      data: { sharedAt: new Date() },
    });
    return { ok: true as const, shareId: existing.id, documentId: null, reused: true };
  }

  const share = await db.analysandResourceShare.create({
    data: { resourceId: resource.id, analysandRecordId },
  });

  const docContent = buildDocContent(resource);
  const doc = await db.medicalDocument.create({
    data: {
      analysandRecordId,
      psychoanalystId,
      type: "OTHER",
      title: encrypt(title),
      content: docContent ? encrypt(docContent) : null,
      fileUrl: resource.fileUrl ?? null,
    },
  });

  const record = await db.analysandRecord.findUnique({ where: { id: analysandRecordId } });
  if (record?.linkedUserId) {
    await notifyPatientShare({
      userId: record.linkedUserId,
      title,
      documentId: doc.id,
      resourceId: resource.id,
      shareId: share.id,
      bodyKey: "notif.newResource.bodyAnalyst",
    });
  }

  return { ok: true as const, shareId: share.id, documentId: doc.id, reused: false };
}

/** Share library resource with an integrative client chart. Creates medicalDocument mirror. */
export async function shareResourceWithIntegrativeClient(
  resource: ResourceRow,
  integrativeClientRecordId: string,
  integrativeTherapistId: string,
) {
  if (resource.active === false) {
    return { error: "Resource inactive" as const, status: 400 };
  }

  const existing = await db.integrativeResourceShare.findUnique({
    where: {
      resourceId_integrativeClientRecordId: {
        resourceId: resource.id,
        integrativeClientRecordId,
      },
    },
  });

  const title = safeDecryptResource(resource.title);

  if (existing) {
    await db.integrativeResourceShare.update({
      where: { id: existing.id },
      data: { sharedAt: new Date() },
    });
    return { ok: true as const, shareId: existing.id, documentId: null, reused: true };
  }

  const share = await db.integrativeResourceShare.create({
    data: { resourceId: resource.id, integrativeClientRecordId },
  });

  const docContent = buildDocContent(resource);
  const doc = await db.medicalDocument.create({
    data: {
      integrativeClientRecordId,
      integrativeTherapistId,
      type: "OTHER",
      title: encrypt(title),
      content: docContent ? encrypt(docContent) : null,
      fileUrl: resource.fileUrl ?? null,
    },
  });

  const client = await db.integrativeClientRecord.findUnique({
    where: { id: integrativeClientRecordId },
  });
  if (client?.linkedUserId) {
    await notifyPatientShare({
      userId: client.linkedUserId,
      title,
      documentId: doc.id,
      resourceId: resource.id,
      shareId: share.id,
      bodyKey: "notif.newResource.bodyIntegrative",
    });
  }

  return { ok: true as const, shareId: share.id, documentId: doc.id, reused: false };
}
