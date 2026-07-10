// src/app/(dashboard)/professional/patients/page.tsx
// Professional's patients: own charts + colleague-shared charts.

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { decrypt } from "@/lib/encryption";
import { listSharedChartsForProfessional } from "@/lib/shared-charts-list";
import PatientsClient from "./PatientsClient";

function safeDecrypt(v: string): string {
  try { return decrypt(v); } catch { return v; }
}

export default async function ProfessionalPatients() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PROFESSIONAL") redirect("/patient");

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!professional) redirect("/onboarding");

  const records = await db.patientRecord.findMany({
    where: { professionalId: professional.id },
    orderBy: { updatedAt: "desc" },
  });

  const ownedIds = new Set(records.map((r) => r.id));

  const ownedCharts = records.map((r) => ({
    id: r.id,
    firstName: safeDecrypt(r.firstName),
    lastName: safeDecrypt(r.lastName),
    email: r.email || null,
    hasAccount: !!r.linkedUserId,
    updatedAt: r.updatedAt.toISOString(),
    access: "owner" as const,
  }));

  const shared = await listSharedChartsForProfessional(professional.id);
  const sharedCharts = shared
    .filter((s) => !ownedIds.has(s.recordId))
    .map((s) => ({
      id: s.recordId,
      firstName: s.firstName,
      lastName: s.lastName,
      email: null as string | null,
      hasAccount: s.hasAccount,
      updatedAt: s.updatedAt,
      access: s.permission === "EDIT" ? ("edit" as const) : ("view" as const),
      ownerName: s.ownerName,
      sharedVia: s.sharedVia,
    }));

  const charts = [...ownedCharts, ...sharedCharts].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return <PatientsClient initialCharts={charts} />;
}
