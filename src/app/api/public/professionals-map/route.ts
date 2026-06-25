import { NextRequest, NextResponse } from "next/server";
import { getProfessionalsMap } from "@/lib/professionals-map-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const result = await getProfessionalsMap({
      lat: searchParams.get("lat"),
      lng: searchParams.get("lng"),
      q: searchParams.get("q"),
      specialty: searchParams.get("specialty"),
      radiusKm: searchParams.get("radiusKm"),
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[PUBLIC-PROFESSIONALS-MAP]", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
