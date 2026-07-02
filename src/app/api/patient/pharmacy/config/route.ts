import { NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { getPharmacyPublicConfig } from "@/lib/pharmacy-marketplace";

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  return NextResponse.json(getPharmacyPublicConfig());
}
