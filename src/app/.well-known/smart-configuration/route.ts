import { NextResponse } from "next/server";
import { getSmartConfiguration } from "@/lib/fhir/smart-config";

export async function GET() {
  return NextResponse.json(getSmartConfiguration(), {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
