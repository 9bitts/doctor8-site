// src/app/(dashboard)/patient/documents/page.tsx
// Patient's documents — two sources, both shown with the same categories:
//   1) Their OWN documents (medicalDocument.patientId = me, no professional) — no tag
//   2) Records SHARED by a doctor (SharedRecord.sharedWithUserId = me) — "Shared by Dr. X" tag
// Phase 4D-2: own documents also carry the list of doctors they're shared WITH,
// so the patient can un-share.
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { resolveRoleHome } from "@/lib/role-home";
import { audit } from "@/lib/audit";
import { decrypt } from "@/lib/encryption";
import DocumentsClient from "./DocumentsClient";
import { documentHasStoredFile } from "@/lib/document-file";

export const dynamic = "force-dynamic";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export default async function PatientDocuments() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PATIENT") redirect(resolveRoleHome(session.user.role));

  const patient = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!patient) redirect("/onboarding");

  // 1) Patient's own documents (no professional attached)
  const ownDocs = await db.medicalDocument.findMany({
    where: { patientId: patient.id, professionalId: null, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { category: { select: { name: true, groupName: true } } },
  });

  // 1b) Which doctors each own document is shared with (by this patient)
  const myShares = await db.sharedRecord.findMany({
    where: {
      sharedByUserId: session.user.id,
      sharedWithProfessionalId: { not: null },
    },
    include: {
      sharedWithProfessional: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  const sharedDoctorsByDoc = new Map<string, { professionalId: string; name: string }[]>();
  for (const s of myShares) {
    if (!s.sharedWithProfessional) continue;
    const list = sharedDoctorsByDoc.get(s.documentId) || [];
    list.push({
      professionalId: s.sharedWithProfessional.id,
      name: `Dr. ${s.sharedWithProfessional.firstName} ${s.sharedWithProfessional.lastName}`,
    });
    sharedDoctorsByDoc.set(s.documentId, list);
  }

  // 2) Records shared with this patient by a doctor
  const shares = await db.sharedRecord.findMany({
    where: { sharedWithUserId: session.user.id, sharedByUserId: null },
    include: {
      document: {
        include: {
          professional: { select: { firstName: true, lastName: true, specialty: true } },
          category: { select: { name: true, groupName: true } },
          dossier: { select: { id: true, title: true } },
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
    hasFile: documentHasStoredFile(d),
    createdAt: d.createdAt.toISOString(),
    sharedBy: null as string | null,
    sharedWithDoctors: sharedDoctorsByDoc.get(d.id) || [],
    signatureStatus: d.signatureStatus as string | null,
    dossierId: d.dossierId as string | null,
    dossierTitle: null as string | null,
  }));

  const sharedItems = shares
    .filter((s) => s.document && !s.document.deletedAt)
    .map((s) => ({
      id: s.document!.id,
      type: s.document!.type as string,
      categoryName: s.document!.category?.name ?? null,
      categoryGroup: s.document!.category?.groupName ?? null,
      title: safeDecrypt(s.document!.title),
      content: s.document!.content ? safeDecrypt(s.document!.content) : null,
      hasFile: documentHasStoredFile(s.document!),
      createdAt: s.createdAt.toISOString(),
      sharedBy: s.document!.professional
        ? `Dr. ${s.document!.professional.firstName} ${s.document!.professional.lastName}`
        : "your doctor",
      sharedWithDoctors: [] as { professionalId: string; name: string }[],
      signatureStatus: s.document!.signatureStatus as string | null,
      dossierId: s.document!.dossierId as string | null,
      dossierTitle: s.document!.dossier?.title ?? null,
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
