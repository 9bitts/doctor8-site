import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import {
  resolveDrugLeafletByDrugId,
  resolveDrugLeafletByMnSlug,
} from "@/lib/drug-leaflet/resolve-leaflet";

export async function GET(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const { searchParams } = new URL(req.url);
  const drugId = searchParams.get("drugId")?.trim();
  const mnSlug = searchParams.get("mnSlug")?.trim();

  if (!drugId && !mnSlug) {
    return NextResponse.json({ error: "drugId or mnSlug required" }, { status: 400 });
  }

  try {
    const leaflet = drugId
      ? await resolveDrugLeafletByDrugId(drugId)
      : await resolveDrugLeafletByMnSlug(mnSlug!);

    if (!leaflet) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ leaflet });
  } catch (err) {
    console.error("[drugs/leaflet] professional:", err);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
