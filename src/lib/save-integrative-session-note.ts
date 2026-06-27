import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";

function defaultSessionTitle(): string {
  return `Sess\u00e3o \u2014 ${new Date().toLocaleDateString("pt-BR")}`;
}

export async function saveIntegrativeSessionNote(params: {
  integrativeTherapistId: string;
  integrativeClientRecordId: string;
  content: string;
  practiceSlug?: string | null;
  title?: string;
  appointmentId?: string | null;
}) {
  const record = await db.integrativeClientRecord.findFirst({
    where: {
      id: params.integrativeClientRecordId,
      integrativeTherapistId: params.integrativeTherapistId,
    },
    select: { id: true },
  });
  if (!record) throw new Error("CLIENT_NOT_FOUND");

  const title = params.title ?? defaultSessionTitle();
  const payload = {
    integrativeNote: true,
    format: "FREE",
    body: params.content,
    practiceSlug: params.practiceSlug ?? null,
  };

  return db.medicalDocument.create({
    data: {
      integrativeClientRecordId: params.integrativeClientRecordId,
      integrativeTherapistId: params.integrativeTherapistId,
      appointmentId: params.appointmentId || null,
      type: "CLINICAL_NOTE",
      title: encrypt(title),
      content: encrypt(JSON.stringify(payload)),
    },
    select: { id: true, createdAt: true },
  });
}
