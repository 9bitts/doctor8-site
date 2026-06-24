// GET — search CID-10 / ICD-10 codes by code or description (for clinical records).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { lookupIcd10, searchIcd10 } from "icdwise";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Direct code lookup (e.g. "E11", "E11.9")
  const codeMatch = q.match(/^[A-Za-z]\d{2}(\.\d{1,4})?$/);
  if (codeMatch) {
    const hit = lookupIcd10(q.toUpperCase());
    if (hit.found) {
      return NextResponse.json({
        results: [{ code: hit.code, description: hit.description }],
      });
    }
  }

  const hits = searchIcd10(q, 12);
  return NextResponse.json({
    results: hits.results.map((h) => ({ code: h.code, description: h.description })),
  });
}
