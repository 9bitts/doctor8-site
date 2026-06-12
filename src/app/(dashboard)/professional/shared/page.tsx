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
  if (!session?.user) redirect("/login");
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

  const items = shares
    .filter((s) => s.document)
    .map((s) => ({
      shareId: s.id,
      documentId: s.document!.id,
      title: safeDecrypt(s.document!.title),
      content: s.document!.content ? safeDecrypt(s.document!.content) : null,
      categoryName: s.document!.category?.name ?? null,
      categoryGroup: s.document!.category?.groupName ?? null,
      type: s.document!.type as string,
      hasFile: !!s.document!.fileUrl,
      patientName: `${safeDecrypt(s.patient.firstName)} ${safeDecrypt(s.patient.lastName)}`.trim(),
      sharedAt: s.createdAt.toISOString(),
    }));

  return <SharedWithMeClient initialItems={items} />;
}
