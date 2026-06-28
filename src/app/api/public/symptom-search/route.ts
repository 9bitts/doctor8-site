import { NextRequest, NextResponse } from "next/server";
import { matchSymptomQuery, type SymptomLang } from "@/lib/symptom-search";

function parseLang(raw: string | null): SymptomLang {
  if (raw === "en" || raw === "es" || raw === "pt") return raw;
  return "pt";
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const lang = parseLang(req.nextUrl.searchParams.get("lang"));

  if (q.length < 3) {
    return NextResponse.json({ match: null, query: q, lang });
  }

  const match = matchSymptomQuery(q, lang);
  if (!match) {
    return NextResponse.json({ match: null, query: q, lang });
  }

  return NextResponse.json({
    query: q,
    lang,
    match: {
      specialtySlug: match.specialtySlug,
      matchedKeyword: match.matchedKeyword,
    },
  });
}
