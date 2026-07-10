// GET — search Brazilian CID-10 codes by code or description (for clinical records).

import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { searchCid10Catalog, searchCid10FromDb } from "@/lib/cid10-search";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = searchCid10Catalog(q, 15);
    return NextResponse.json({ results });
  } catch (memErr) {
    console.error("[cid/search] in-memory catalog failed, trying DB:", memErr);
    try {
      const results = await searchCid10FromDb(q, 15);
      return NextResponse.json({ results });
    } catch (dbErr) {
      console.error("[cid/search] DB fallback failed:", dbErr);
      return NextResponse.json({ error: "Search failed", results: [] }, { status: 500 });
    }
  }
}
