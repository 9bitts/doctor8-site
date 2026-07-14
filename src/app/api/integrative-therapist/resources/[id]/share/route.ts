import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { requireIntegrativeTherapist, safeDecrypt } from "@/lib/integrative-therapist-api";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const resource = await db.resource.findUnique({ where: { id: params.id } });
  if (!resource || resource.integrativeTherapistId !== therapist.id) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  const body = await req.json();
  const { integrativeClientRecordId } = body;
  if (!integrativeClientRecordId) {
    return NextResponse.json({ error: "integrativeClientRecordId required" }, { status: 400 });
  }

  const client = await db.integrativeClientRecord.findUnique({
    where: { id: integrativeClientRecordId },
  });
  if (!client || client.integrativeTherapistId !== therapist.id) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  await db.integrativeResourceShare.upsert({
    where: {
      resourceId_integrativeClientRecordId: {
        resourceId: params.id,
        integrativeClientRecordId,
      },
    },
    create: { resourceId: params.id, integrativeClientRecordId },
    update: { sharedAt: new Date() },
  });

  const title = safeDecrypt(resource.title);

  if (client.linkedUserId) {
    await db.notification
      .create({
        data: {
          userId: client.linkedUserId,
          type: "DOCUMENT_SHARED",
          title: "Novo recurso compartilhado",
          body: `Seu terapeuta compartilhou um recurso: ${title}`,
          data: JSON.stringify({
            titleKey: "notif.newResource.title",
            bodyKey: "notif.newResource.body",
            bodyParams: { title },
          }),
        },
      })
      .catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
