import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { decrypt } from "@/lib/encryption";
import { buildPatientFhirBundle } from "@/lib/fhir/patient-bundle";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const patient = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      medications: {
        where: { active: true, flow: "CLINICAL" },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await audit.exportData(session.user.id);

  const bundle = buildPatientFhirBundle({
    patientId: patient.id,
    userId: session.user.id,
    firstName: decrypt(patient.firstName),
    lastName: decrypt(patient.lastName),
    dateOfBirth: patient.dateOfBirth ? decrypt(patient.dateOfBirth) : null,
    sex: patient.sex,
    bloodType: patient.bloodType,
    allergies: patient.allergies ? decrypt(patient.allergies) : null,
    chronicConditions: patient.chronicConditions ? decrypt(patient.chronicConditions) : null,
    medications: patient.medications.map((m) => ({
      id: m.id,
      name: decrypt(m.name),
      dosage: m.dosage ? decrypt(m.dosage) : null,
      frequency: m.frequency ? decrypt(m.frequency) : null,
      prescribedBy: m.prescribedBy,
    })),
  });

  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(JSON.stringify(bundle, null, 2), {
    headers: {
      "Content-Type": "application/fhir+json",
      "Content-Disposition": `attachment; filename="doctor8-fhir-${date}.json"`,
    },
  });
}
