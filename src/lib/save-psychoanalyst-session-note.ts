import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";

function defaultSessionTitle(): string {
  return `Sess\u00e3o \u2014 ${new Date().toLocaleDateString("pt-BR")}`;
}

export async function savePsychoanalystSessionNote(params: {
  psychoanalystId: string;
  analysandRecordId: string;
  content: string;
  title?: string;
  appointmentId?: string | null;
}) {
  const record = await db.analysandRecord.findFirst({
    where: { id: params.analysandRecordId, psychoanalystId: params.psychoanalystId },
    select: { id: true },
  });
  if (!record) throw new Error("ANALYSAND_NOT_FOUND");

  const title = params.title ?? defaultSessionTitle();
  const payload = { psychoanalyticNote: true, format: "FREE", body: params.content };

  return db.medicalDocument.create({
    data: {
      analysandRecordId: params.analysandRecordId,
      psychoanalystId: params.psychoanalystId,
      appointmentId: params.appointmentId || null,
      type: "CLINICAL_NOTE",
      title: encrypt(title),
      content: encrypt(JSON.stringify(payload)),
    },
    select: { id: true, createdAt: true },
  });
}
