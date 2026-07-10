// GET — search Brazilian CID-10 codes by code or description (for clinical records).

import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { searchCid10Catalog } from "@/lib/cid10-search";

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
  } catch (err) {
    console.error("[cid/search]", err);
    return NextResponse.json({ error: "Search failed", results: [] }, { status: 500 });
  }
}
