// WhatsApp delivery for clinical emissions (Phase 6).

import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import {
  buildClinicalDocumentWaMeUrl,
  isWhatsAppConfigured,
  sendClinicalDocumentWhatsApp,
  type WhatsAppDeliveryStatus,
} from "@/lib/whatsapp";
import type { EmissionDeliverKind } from "@/lib/emission-deliver";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://doctor8.app";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v || ""; }
}

export type WhatsAppDeliverResult = {
  status: WhatsAppDeliveryStatus | "ALREADY_SENT";
  error?: string;
  waMeUrl?: string | null;
};

const DOC_LABEL: Record<EmissionDeliverKind, string> = {
  prescription: "receita m?dica",
  exam: "pedido de exame",
  document: "documento cl?nico",
};

function shareUrl(hasAccount: boolean, kind: EmissionDeliverKind): string {
  if (!hasAccount) return `${APP_URL}/register`;
  if (kind === "prescription") return `${APP_URL}/patient/prescriptions`;
  return `${APP_URL}/patient/documents`;
}

function defaultMessage(
  patientName: string,
  doctorName: string,
  kind: EmissionDeliverKind,
  url: string,
  custom?: string,
): string {
  if (custom?.trim()) {
    return custom
      .replace(/\{\{name\}\}/g, patientName)
      .replace(/\{\{doctor\}\}/g, doctorName)
      .replace(/\{\{link\}\}/g, url);
  }
  const label = DOC_LABEL[kind];
  return `Ol? ${patientName}, Dr(a). ${doctorName} enviou um(a) ${label} no Doctor8. Acesse: ${url}`;
}

async function resolvePatientPhone(
  record: { phone?: string | null } | null | undefined,
  profile: { phone?: string | null } | null | undefined,
): Promise<string | null> {
  const fromRecord = record?.phone ? safeDecrypt(record.phone) : "";
  if (fromRecord.trim()) return fromRecord.trim();
  const fromProfile = profile?.phone ? safeDecrypt(profile.phone) : "";
  return fromProfile.trim() || null;
}

export async function sendEmissionWhatsApp(opts: {
  kind: EmissionDeliverKind;
  prescriptionId?: string;
  documentId?: string;
  doctorName: string;
  force?: boolean;
  customMessage?: string;
}): Promise<WhatsAppDeliverResult> {
  const { kind, doctorName, force, customMessage } = opts;

  if (kind === "prescription" && opts.prescriptionId) {
    const prescription = await db.prescription.findUnique({
      where: { id: opts.prescriptionId },
      include: {
        document: {
          include: {
            patientRecord: { select: { phone: true, firstName: true, lastName: true, linkedUserId: true } },
            patient: { select: { phone: true, firstName: true, lastName: true, userId: true } },
          },
        },
      },
    });
    if (!prescription) return { status: "FAILED", error: "Not found" };

    if (prescription.whatsappNotifiedAt && !force) {
      return { status: "ALREADY_SENT" };
    }

    const record = prescription.document?.patientRecord;
    const profile = prescription.document?.patient;
    const phone = await resolvePatientPhone(record, profile);
    const firstName = record ? safeDecrypt(record.firstName) : profile ? safeDecrypt(profile.firstName) : "";
    const lastName = record ? safeDecrypt(record.lastName) : profile ? safeDecrypt(profile.lastName) : "";
    const patientName = `${firstName} ${lastName}`.trim() || "paciente";
    const hasAccount = !!(record?.linkedUserId || profile?.userId);
    const url = shareUrl(hasAccount, kind);
    const msg = defaultMessage(patientName, doctorName, kind, url, customMessage);
    const waMeUrl = phone ? buildClinicalDocumentWaMeUrl(phone, msg) : null;

    if (!phone) {
      await db.prescription.update({
        where: { id: prescription.id },
        data: { whatsappNotifyStatus: "NO_PHONE" },
      });
      return { status: "NO_PHONE", waMeUrl: null };
    }

    if (!isWhatsAppConfigured()) {
      await db.prescription.update({
        where: { id: prescription.id },
        data: { whatsappNotifyStatus: "SKIPPED" },
      });
      return { status: "SKIPPED", waMeUrl };
    }

    const result = await sendClinicalDocumentWhatsApp({
      toPhone: phone,
      patientName,
      doctorName,
      accessUrl: url,
      documentLabel: DOC_LABEL[kind],
    });

    if (result.skipped) {
      await db.prescription.update({
        where: { id: prescription.id },
        data: { whatsappNotifyStatus: "SKIPPED" },
      });
      return { status: "SKIPPED", waMeUrl };
    }

    if (!result.ok) {
      await db.prescription.update({
        where: { id: prescription.id },
        data: { whatsappNotifyStatus: "FAILED" },
      });
      return { status: "FAILED", error: result.error, waMeUrl };
    }

    await db.prescription.update({
      where: { id: prescription.id },
      data: {
        whatsappNotifiedAt: new Date(),
        whatsappNotifyStatus: "SENT",
      },
    });
    return { status: "SENT", waMeUrl };
  }

  if (opts.documentId) {
    const document = await db.medicalDocument.findUnique({
      where: { id: opts.documentId },
      include: {
        patientRecord: { select: { phone: true, firstName: true, lastName: true, linkedUserId: true } },
        patient: { select: { phone: true, firstName: true, lastName: true, userId: true } },
      },
    });
    if (!document) return { status: "FAILED", error: "Not found" };

    if (document.whatsappNotifiedAt && !force) {
      return { status: "ALREADY_SENT" };
    }

    const record = document.patientRecord;
    const profile = document.patient;
    const phone = await resolvePatientPhone(record, profile);
    const firstName = record ? safeDecrypt(record.firstName) : profile ? safeDecrypt(profile.firstName) : "";
    const lastName = record ? safeDecrypt(record.lastName) : profile ? safeDecrypt(profile.lastName) : "";
    const patientName = `${firstName} ${lastName}`.trim() || "paciente";
    const hasAccount = !!(record?.linkedUserId || profile?.userId);
    const docKind: EmissionDeliverKind =
      document.type === "EXAM_REQUEST" || document.type === "EXAM_RESULT" ? "exam" : "document";
    const url = shareUrl(hasAccount, docKind);
    const msg = defaultMessage(patientName, doctorName, docKind, url, customMessage);
    const waMeUrl = phone ? buildClinicalDocumentWaMeUrl(phone, msg) : null;

    if (!phone) {
      await db.medicalDocument.update({
        where: { id: document.id },
        data: { whatsappNotifyStatus: "NO_PHONE" },
      });
      return { status: "NO_PHONE", waMeUrl: null };
    }

    if (!isWhatsAppConfigured()) {
      await db.medicalDocument.update({
        where: { id: document.id },
        data: { whatsappNotifyStatus: "SKIPPED" },
      });
      return { status: "SKIPPED", waMeUrl };
    }

    const result = await sendClinicalDocumentWhatsApp({
      toPhone: phone,
      patientName,
      doctorName,
      accessUrl: url,
      documentLabel: DOC_LABEL[docKind],
    });

    if (result.skipped) {
      await db.medicalDocument.update({
        where: { id: document.id },
        data: { whatsappNotifyStatus: "SKIPPED" },
      });
      return { status: "SKIPPED", waMeUrl };
    }

    if (!result.ok) {
      await db.medicalDocument.update({
        where: { id: document.id },
        data: { whatsappNotifyStatus: "FAILED" },
      });
      return { status: "FAILED", error: result.error, waMeUrl };
    }

    await db.medicalDocument.update({
      where: { id: document.id },
      data: {
        whatsappNotifiedAt: new Date(),
        whatsappNotifyStatus: "SENT",
      },
    });
    return { status: "SENT", waMeUrl };
  }

  return { status: "FAILED", error: "Missing id" };
}
