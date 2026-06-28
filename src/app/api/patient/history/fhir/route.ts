import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { buildFhirBundleForPatient } from "@/lib/fhir/load-patient-fhir";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const patient = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bundle = await buildFhirBundleForPatient(patient.id, session.user.id);
  if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await audit.exportData(session.user.id);

  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(JSON.stringify(bundle, null, 2), {
    headers: {
      "Content-Type": "application/fhir+json",
      "Content-Disposition": `attachment; filename="doctor8-fhir-${date}.json"`,
    },
  });
}
