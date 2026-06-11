// src/app/(dashboard)/professional/patients/[id]/page.tsx
// Detail of one patient chart: info + clinical records, with a form to add records.
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { decrypt } from "@/lib/encryption";
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
      medicalDocuments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!record || record.professionalId !== professional.id) notFound();

  const chart = {
    id: record.id,
    firstName: safeDecrypt(record.firstName),
    lastName: safeDecrypt(record.lastName),
    email: record.email,
    phone: record.phone ? safeDecrypt(record.phone) : null,
    notes: record.notes ? safeDecrypt(record.notes) : null,
    hasAccount: !!record.linkedUserId,
  };

  const documents = record.medicalDocuments.map((d) => ({
    id: d.id,
    type: d.type as string,
    title: safeDecrypt(d.title),
    content: d.content ? safeDecrypt(d.content) : null,
    hasFile: !!d.fileUrl,
    createdAt: d.createdAt.toISOString(),
  }));

  return <RecordDetailClient chart={chart} initialDocuments={documents} />;
}
