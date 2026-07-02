import { NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { buildFhirBundleForPatient } from "@/lib/fhir/load-patient-fhir";

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId, patientProfileId } = ctx;

  const bundle = await buildFhirBundleForPatient(patientProfileId, userId);
  if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await audit.exportData(userId);

  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(JSON.stringify(bundle, null, 2), {
    headers: {
      "Content-Type": "application/fhir+json",
      "Content-Disposition": `attachment; filename="doctor8-fhir-${date}.json"`,
    },
  });
}
