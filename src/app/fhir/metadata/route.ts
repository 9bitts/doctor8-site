import { NextResponse } from "next/server";
import { getFhirCapabilityStatement } from "@/lib/fhir/smart-config";

export async function GET() {
  return new NextResponse(JSON.stringify(getFhirCapabilityStatement(), null, 2), {
    headers: {
      "Content-Type": "application/fhir+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
