// src/app/(dashboard)/professional/patients/[id]/page.tsx
// Detail of one patient chart: info + clinical records, with a form to add records.
// P1-b: also loads the registration data (birth, sex, cpf, address) so the doctor
// can review/complete it from the chart.
// P4: passes linkedUserId so RecordDetailClient can show the "Send message" button.
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { decrypt } from "@/lib/encryption";
import { countRecordAttachments } from "@/lib/record-content";
import { resolveChartAccess, auditChartView } from "@/lib/chart-access";
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
  if (!session?.user) redirect("/login/medico");
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
      medicalDocuments: {
        orderBy: { createdAt: "desc" },
        include: { category: { select: { name: true, groupName: true } } },
      },
    },
  });

  if (!record) notFound();

  const access = await resolveChartAccess(professional.id, params.id);
  if (!access) notFound();

  await auditChartView(session.user.id, record.id, access);

  const readOnly = access.level === "view";

  const chart = {
    id: record.id,
    firstName: safeDecrypt(record.firstName),
    lastName: safeDecrypt(record.lastName),
    email: record.email,
    phone: record.phone ? safeDecrypt(record.phone) : null,
    notes: record.notes ? safeDecrypt(record.notes) : null,
    hasAccount: !!record.linkedUserId,
    linkedUserId: record.linkedUserId || null,
    // P1-b registration data
    dateOfBirth: record.dateOfBirth ? safeDecrypt(record.dateOfBirth) : "",
    sex: record.sex || "",
    cpf: record.cpf ? safeDecrypt(record.cpf) : "",
    addressLine1: record.addressLine1 ? safeDecrypt(record.addressLine1) : "",
    city: record.city || "",
    state: record.state || "",
    country: record.country || "",
    zipCode: record.zipCode ? safeDecrypt(record.zipCode) : "",
  };

  const documents = record.medicalDocuments.map((d) => ({
    id: d.id,
    type: d.type as string,
    recordKind: d.recordKind,
    categoryName: d.category?.name ?? null,
    categoryGroup: d.category?.groupName ?? null,
    title: safeDecrypt(d.title),
    content: d.content ? safeDecrypt(d.content) : null,
    hasFile: !!d.fileUrl,
    attachmentCount: countRecordAttachments(!!d.fileUrl, d.content ? safeDecrypt(d.content) : null),
    createdAt: d.createdAt.toISOString(),
    sourceDocumentId: d.sourceDocumentId ?? null,
    canEdit: !d.sourceDocumentId,
  }));

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
