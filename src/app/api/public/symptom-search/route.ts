import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  clientIp,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { normalizeLang } from "@/lib/i18n/translations";
import { searchSymptomsUnified } from "@/lib/symptom-search-unified";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ip = clientIp(req);
  const rate = await checkRateLimit({
    namespace: "symptom-search:ip",
    key: ip,
    ...RATE_LIMITS.supportIp,
  });
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const lang = normalizeLang(req.nextUrl.searchParams.get("lang"));
  const useAi = req.nextUrl.searchParams.get("ai") !== "0";

  if (q.length < 2) {
    return NextResponse.json({ query: q, lang, matches: [], aiUsed: false });
  }

  const { matches, aiUsed } = await searchSymptomsUnified(q, lang, { useAi });

  return NextResponse.json({
    query: q,
    lang,
    aiUsed,
    matches,
    match: matches[0]
      ? {
          specialtySlug: matches[0].specialtySlug,
          label: matches[0].label,
          reason: matches[0].reason,
        }
      : null,
  });
}
