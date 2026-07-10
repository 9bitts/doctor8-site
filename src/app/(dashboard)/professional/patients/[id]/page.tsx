// src/app/(dashboard)/professional/patients/[id]/page.tsx
// Detail of one patient chart: info + clinical records, with a form to add records.

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { decrypt } from "@/lib/encryption";
import { countRecordAttachments } from "@/lib/record-content";
import { resolveChartAccess, auditChartView } from "@/lib/chart-access";
import {
  computeMissingForRx,
  loadChartMedicalDocuments,
  syncChartDocuments,
} from "@/lib/patient-chart-documents";
import { Suspense } from "react";
import RecordDetailClient from "./RecordDetailClient";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export default async function PatientChartDetail({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PROFESSIONAL") redirect("/patient");

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!professional) redirect("/onboarding");

  const record = await db.patientRecord.findUnique({
    where: { id: params.id },
    include: {
      professional: { select: { firstName: true, lastName: true } },
      tags: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!record) notFound();

  const access = await resolveChartAccess(professional.id, params.id);
  if (!access) notFound();

  await auditChartView(session.user.id, record.id, access);

  const readOnly = access.level === "view";

  await syncChartDocuments({
    chartId: record.id,
    professionalId: access.ownerProfessionalId,
    linkedUserId: record.linkedUserId,
    chartEmail: record.email,
  });

  const medicalDocuments = await loadChartMedicalDocuments(
    record.id,
    access.ownerProfessionalId,
  );

  let patientAvatarUrl: string | null = null;
  let profileAllergies: string | null = null;
  if (record.linkedUserId) {
    const patientProfile = await db.patientProfile.findUnique({
      where: { userId: record.linkedUserId },
      select: { avatarUrl: true, allergies: true },
    });
    patientAvatarUrl = patientProfile?.avatarUrl ?? null;
    profileAllergies = patientProfile?.allergies ? safeDecrypt(patientProfile.allergies) : null;
  }

  const firstName = safeDecrypt(record.firstName);
  const lastName = safeDecrypt(record.lastName);
  const dateOfBirth = record.dateOfBirth ? safeDecrypt(record.dateOfBirth) : "";
  const addressLine1 = record.addressLine1 ? safeDecrypt(record.addressLine1) : "";

  const chart = {
    id: record.id,
    firstName,
    lastName,
    email: record.email,
    phone: record.phone ? safeDecrypt(record.phone) : null,
    notes: record.notes ? safeDecrypt(record.notes) : null,
    hasAccount: !!record.linkedUserId,
    linkedUserId: record.linkedUserId || null,
    avatarUrl: patientAvatarUrl,
    dateOfBirth,
    sex: record.sex || "",
    cpf: record.cpf ? safeDecrypt(record.cpf) : "",
    addressLine1,
    city: record.city || "",
    state: record.state || "",
    country: record.country || "",
    zipCode: record.zipCode ? safeDecrypt(record.zipCode) : "",
    missingForRx: computeMissingForRx({
      firstName,
      lastName,
      dobDecrypted: dateOfBirth || null,
      addressLine1: addressLine1 || null,
      city: record.city || null,
    }),
    profileAllergies,
  };

  const documents = medicalDocuments.map((d) => {
    const rx = d.prescriptions[0];
    const contentRaw = d.content ? safeDecrypt(d.content) : null;
    let medications: { name: string; dosage?: string; frequency?: string }[] | null = null;
    if (rx?.medications && Array.isArray(rx.medications)) {
      medications = rx.medications as { name: string; dosage?: string; frequency?: string }[];
    }
    return {
      id: d.id,
      type: d.type as string,
      recordKind: d.recordKind,
      categoryName: d.category?.name ?? null,
      categoryGroup: d.category?.groupName ?? null,
      title: safeDecrypt(d.title),
      content: contentRaw,
      hasFile: !!d.fileUrl,
      attachmentCount: countRecordAttachments(!!d.fileUrl, contentRaw),
      createdAt: d.createdAt.toISOString(),
      sourceDocumentId: d.sourceDocumentId ?? null,
      canEdit: !d.sourceDocumentId && d.type !== "PRESCRIPTION",
      prescriptionId: rx?.id ?? null,
      signatureStatus: rx?.signatureStatus ?? d.signatureStatus ?? null,
      whatsappNotifyStatus: rx?.whatsappNotifyStatus ?? d.whatsappNotifyStatus ?? null,
      patientNotifiedAt: !!(rx?.patientNotifiedAt ?? d.patientNotifiedAt),
      medications,
    };
  });

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">...</div>}>
      <RecordDetailClient
        chart={chart}
        initialDocuments={documents}
        initialTags={record.tags.map((tag) => ({
          id: tag.id,
          kind: tag.kind,
          label: tag.label,
        }))}
        chartAccess={access.level}
        readOnly={readOnly}
        ownerName={
          access.level !== "owner"
            ? `${record.professional.firstName} ${record.professional.lastName}`
            : undefined
        }
      />
    </Suspense>
  );
}
