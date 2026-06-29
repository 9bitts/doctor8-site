import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import {
  renderStructuredNote,
  structuredValuesHaveContent,
  type StructuredValues,
} from "@/lib/pics/consult-templates";
import type { IntegrativeVisitType } from "@/lib/integrative-consult-context";

function defaultSessionTitle(): string {
  return `Sess\u00e3o \u2014 ${new Date().toLocaleDateString("pt-BR")}`;
}

export async function saveIntegrativeSessionNote(params: {
  integrativeTherapistId: string;
  integrativeClientRecordId: string;
  content?: string;
  practiceSlug?: string | null;
  title?: string;
  appointmentId?: string | null;
  structured?: StructuredValues | null;
  visitType?: IntegrativeVisitType | null;
  lang?: "pt" | "en" | "es";
}) {
  const record = await db.integrativeClientRecord.findFirst({
    where: {
      id: params.integrativeClientRecordId,
      integrativeTherapistId: params.integrativeTherapistId,
    },
    select: { id: true },
  });
  if (!record) throw new Error("CLIENT_NOT_FOUND");

  const practiceSlug = params.practiceSlug ?? null;
  const lang = params.lang ?? "pt";
  const hasStructured =
    params.structured &&
    practiceSlug &&
    structuredValuesHaveContent(params.structured);

  let body = (params.content ?? "").trim();
  let format: "FREE" | "STRUCTURED" = "FREE";
  let structured: StructuredValues | null = null;

  if (hasStructured && practiceSlug) {
    format = "STRUCTURED";
    structured = params.structured!;
    const rendered = renderStructuredNote(practiceSlug, structured, lang, {
      visitType: params.visitType ?? undefined,
    });
    body = rendered || body;
  }

  if (!body) throw new Error("EMPTY_NOTE");

  const title = params.title ?? defaultSessionTitle();
  const payload = {
    integrativeNote: true,
    format,
    body,
    renderedBody: body,
    practiceSlug,
    structured,
    visitType: params.visitType ?? null,
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
