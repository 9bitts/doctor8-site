// src/app/(dashboard)/patient/documents/page.tsx
// Patient's documents — two sources, both shown with the same categories:
//   1) Their OWN documents (medicalDocument.patientId = me, no professional) — no tag
//   2) Records SHARED by a doctor (SharedRecord.sharedWithUserId = me) — "Shared by Dr. X" tag
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { decrypt } from "@/lib/encryption";
import DocumentsClient from "./DocumentsClient";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export default async function PatientDocuments() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PATIENT") redirect("/professional");

  const patient = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!patient) redirect("/onboarding");

  // 1) Patient's own documents (no professional attached)
  const ownDocs = await db.medicalDocument.findMany({
    where: { patientId: patient.id, professionalId: null },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { category: { select: { name: true, groupName: true } } },
  });

  // 2) Records shared with this patient by a doctor
  const shares = await db.sharedRecord.findMany({
    where: { sharedWithUserId: session.user.id },
    include: {
      document: {
        include: {
          professional: { select: { firstName: true, lastName: true, specialty: true } },
          category: { select: { name: true, groupName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  await audit.viewRecord(session.user.id, "MedicalDocument", "list");

  const ownItems = ownDocs.map((d) => ({
    id: d.id,
    type: d.type as string,
    categoryName: d.category?.name ?? null,
    categoryGroup: d.category?.groupName ?? null,
    title: safeDecrypt(d.title),
    content: d.content ? safeDecrypt(d.content) : null,
    hasFile: !!d.fileUrl,
    createdAt: d.createdAt.toISOString(),
    sharedBy: null as string | null,
  }));

  const sharedItems = shares
    .filter((s) => s.document)
    .map((s) => ({
      id: s.document!.id,
      type: s.document!.type as string,
      categoryName: s.document!.category?.name ?? null,
      categoryGroup: s.document!.category?.groupName ?? null,
      title: safeDecrypt(s.document!.title),
      content: s.document!.content ? safeDecrypt(s.document!.content) : null,
      hasFile: !!s.document!.fileUrl,
      createdAt: s.createdAt.toISOString(),
      sharedBy: s.document!.professional
        ? `Dr. ${s.document!.professional.firstName} ${s.document!.professional.lastName}`
        : "your doctor",
    }));

  // Merge, newest first; de-dup by id (a doc could appear once per source)
  const seen = new Set<string>();
  const all = [...sharedItems, ...ownItems].filter((it) => {
    if (seen.has(it.id)) return false;
    seen.add(it.id);
    return true;
  }).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return <DocumentsClient initialItems={all} />;
}
