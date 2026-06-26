// Build TemplateTagContext from DB records (server-side).

import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import {
  applyTemplateTags,
  formatAddress,
  formatDobDisplay,
  type TemplateTagContext,
} from "@/lib/template-tags";

function safeDecrypt(v: string | null | undefined): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

function decryptDob(raw: unknown): string {
  if (!raw) return "";
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  if (typeof raw === "string") return safeDecrypt(raw);
  return "";
}

export async function buildTemplateContext(
  professionalId: string,
  patientRecordId?: string | null,
  locale = "pt-BR",
): Promise<TemplateTagContext> {
  const professional = await db.professionalProfile.findUnique({
    where: { id: professionalId },
  });
  if (!professional) return { today: new Date().toLocaleDateString(locale) };

  let patientName = "";
  let patientCpf = "";
  let patientDob = "";
  let address = "";

  if (patientRecordId) {
    const record = await db.patientRecord.findFirst({
      where: { id: patientRecordId, professionalId },
    });
    if (record) {
      const first = safeDecrypt(record.firstName);
      const last = safeDecrypt(record.lastName);
      patientName = `${first} ${last}`.trim();
      patientCpf = safeDecrypt(record.cpf);
      patientDob = formatDobDisplay(decryptDob(record.dateOfBirth), locale);
      address = formatAddress({
        addressLine1: safeDecrypt(record.addressLine1),
        city: record.city,
        state: record.state,
        zipCode: safeDecrypt(record.zipCode),
        country: record.country,
      });
    }
  }

  return {
    patientName,
    patientCpf,
    patientDob,
    professionalName: `${professional.firstName} ${professional.lastName}`.trim(),
    licenseNumber: professional.licenseNumber,
    specialty: professional.specialty,
    address,
    clinicName: professional.clinicName || "",
    today: new Date().toLocaleDateString(locale),
  };
}

export async function resolveDocumentTemplate(
  professionalId: string,
  template: { title: string; body: string },
  patientRecordId?: string | null,
  locale = "pt-BR",
) {
  const ctx = await buildTemplateContext(professionalId, patientRecordId, locale);
  return {
    title: applyTemplateTags(template.title, ctx),
    body: applyTemplateTags(template.body, ctx),
    context: ctx,
  };
}
