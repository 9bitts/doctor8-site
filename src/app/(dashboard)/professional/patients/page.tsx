// src/app/(dashboard)/professional/patients/page.tsx
// Professional's patients: charts they created (PatientRecord) + people seen via appointments.
// Server component loads the data; a client component handles the "new chart" form.

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { decrypt } from "@/lib/encryption";
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

  // Charts created by the professional
  const records = await db.patientRecord.findMany({
    where: { professionalId: professional.id },
    orderBy: { updatedAt: "desc" },
  });

  const charts = records.map((r) => ({
    id: r.id,
    firstName: safeDecrypt(r.firstName),
    lastName: safeDecrypt(r.lastName),
    email: r.email || null,
    hasAccount: !!r.linkedUserId,
    updatedAt: r.updatedAt.toISOString(),
  }));

  return <PatientsClient initialCharts={charts} />;
}
