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

  // Charts created by the professional.
  // TEMP DEBUG: surface the real error instead of a blank "Application error",
  // so we can see the actual cause in production. Remove after diagnosing.
  let charts: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    hasAccount: boolean;
    updatedAt: string;
  }>;
  try {
    const records = await db.patientRecord.findMany({
      where: { professionalId: professional.id },
      orderBy: { updatedAt: "desc" },
    });

    charts = records.map((r) => ({
      id: r.id,
      firstName: safeDecrypt(r.firstName),
      lastName: safeDecrypt(r.lastName),
      email: r.email || null,
      hasAccount: !!r.linkedUserId,
      updatedAt: r.updatedAt.toISOString(),
    }));
  } catch (e) {
    console.error("[PATIENTS PAGE ERROR]", e);
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return (
      <div style={{ padding: 24, fontFamily: "monospace", whiteSpace: "pre-wrap", color: "#b91c1c" }}>
        <strong>DEBUG — erro ao carregar pacientes:</strong>
        {"\n\n"}
        {msg}
      </div>
    );
  }

  return <PatientsClient initialCharts={charts} />;
}
