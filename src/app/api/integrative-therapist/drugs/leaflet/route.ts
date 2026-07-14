import { NextRequest, NextResponse } from "next/server";
import { requireIntegrativeTherapist } from "@/lib/integrative-therapist-api";
import { resolveDrugLeafletByMnSlug } from "@/lib/drug-leaflet/resolve-leaflet";

export async function GET(req: NextRequest) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;

  const { searchParams } = new URL(req.url);
  const mnSlug = searchParams.get("mnSlug")?.trim();

  if (!mnSlug) {
    return NextResponse.json({ error: "mnSlug required" }, { status: 400 });
  }

  try {
    const leaflet = await resolveDrugLeafletByMnSlug(mnSlug);
    if (!leaflet) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ leaflet });
  } catch (err) {
    console.error("[drugs/leaflet] integrative:", err);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
