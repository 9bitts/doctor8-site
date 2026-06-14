// src/app/api/patient/prescriptions/route.ts
// Lists the prescriptions that belong to the logged-in patient.
// A prescription belongs to the patient when its MedicalDocument is linked to
// the patient's PatientProfile (document.patientId).

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ prescriptions: [] });

  // Find prescriptions whose document is attached to this patient.
  const prescriptions = await db.prescription.findMany({
    where: {
      document: { patientId: profile.id },
    },
    include: {
      professional: { select: { firstName: true, lastName: true, specialty: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const decoded = prescriptions.map((p) => ({
    id: p.id,
    createdAt: p.createdAt,
    validUntil: p.validUntil,
    medications: p.medications,
    instructions: p.instructions ? safeDecrypt(p.instructions) : "",
    doctor: {
      name: `${p.professional.firstName} ${p.professional.lastName}`.trim(),
      specialty: p.professional.specialty || "",
    },
  }));

  return NextResponse.json({ prescriptions: decoded });
}
