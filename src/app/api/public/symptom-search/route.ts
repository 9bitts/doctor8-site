import { NextRequest, NextResponse } from "next/server";
import { matchSymptomQuery } from "@/lib/symptom-search";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  if (q.length < 3) {
    return NextResponse.json({ match: null });
  }

  const match = matchSymptomQuery(q);
  if (!match) {
    return NextResponse.json({ match: null, query: q });
  }

  return NextResponse.json({
    query: q,
    match: {
      specialtySlug: match.specialtySlug,
      matchedKeyword: match.matchedKeyword,
    },
  });
}
