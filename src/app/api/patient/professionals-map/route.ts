// GET — professionals for the patient map.
// Query: lat, lng, q, specialty, radiusKm (5|10|50|0=all)

import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { getProfessionalsMap } from "@/lib/professionals-map-data";
import { internalErrorResponse } from "@/lib/api-error-response";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requirePatient();
    if (isApiError(ctx)) return ctx.error;
    const { userId } = ctx;

    const { searchParams } = new URL(req.url);
    const result = await getProfessionalsMap({
      lat: searchParams.get("lat"),
      lng: searchParams.get("lng"),
      q: searchParams.get("q"),
      specialty: searchParams.get("specialty"),
      radiusKm: searchParams.get("radiusKm"),
      patientUserId: userId,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    return internalErrorResponse("PROFESSIONALS-MAP", e);
  }
}
