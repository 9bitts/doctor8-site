// src/app/(dashboard)/professional/shared/page.tsx
// Documents that patients shared with this professional.
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { decrypt } from "@/lib/encryption";
import SharedWithMeClient from "./SharedWithMeClient";

export const dynamic = "force-dynamic";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export default async function ProfessionalSharedPage() {
  const session = await auth();
  if (!session?.user) redirect("/login/medico");
  if (session.user.role !== "PROFESSIONAL") redirect("/patient");

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!professional) redirect("/onboarding");

  const shares = await db.sharedRecord.findMany({
    where: { sharedWithProfessionalId: professional.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      document: {
        include: { category: { select: { name: true, groupName: true } } },
      },
      patient: { select: { id: true, firstName: true, lastName: true, userId: true } },
    },
  });

  // Charts of this professional, to know if each patient already has one.
  const charts = await db.patientRecord.findMany({
    where: { professionalId: professional.id },
    select: { id: true, linkedUserId: true, email: true },
  });

  const patientUserIds = Array.from(new Set(shares.map((s) => s.patient.userId)));
  const users = await db.user.findMany({
    where: { id: { in: patientUserIds } },
    select: { id: true, email: true },
  });
  const emailByUser = new Map<string, string | null>(users.map((u) => [u.id, u.email]));

  function findChart(patientUserId: string, patientEmail: string | null | undefined): string | null {
    const byUser = charts.find((c) => c.linkedUserId === patientUserId);
    if (byUser) return byUser.id;
    if (patientEmail) {
      const byEmail = charts.find((c) => (c.email || "").toLowerCase() === patientEmail.toLowerCase());
      if (byEmail) return byEmail.id;
    }
    return null;
  }

  const items = shares
    .filter((s) => s.document)
    .map((s) => {
      const pEmail = emailByUser.get(s.patient.userId) ?? null;
      const firstName = safeDecrypt(s.patient.firstName);
      const lastName = safeDecrypt(s.patient.lastName);
      return {
        shareId: s.id,
        documentId: s.document!.id,
        title: safeDecrypt(s.document!.title),
        content: s.document!.content ? safeDecrypt(s.document!.content) : null,
        categoryName: s.document!.category?.name ?? null,
        categoryGroup: s.document!.category?.groupName ?? null,
        type: s.document!.type as string,
        hasFile: !!s.document!.fileUrl,
        patientName: `${firstName} ${lastName}`.trim(),
        patientFirstName: firstName,
        patientLastName: lastName,
        patientEmail: pEmail,
        existingChartId: findChart(s.patient.userId, pEmail),
        sharedAt: s.createdAt.toISOString(),
      };
    });

  return <SharedWithMeClient initialItems={items} />;
}
