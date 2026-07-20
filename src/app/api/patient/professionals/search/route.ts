// GET /api/patient/professionals/search?q= — search verified professionals by name/CRM.
import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  PRO_SEARCH_MIN_CHARS,
  searchPlatformProfessionals,
} from "@/lib/platform-professional-search";

export async function GET(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const rate = await checkRateLimit({
    namespace: "patient-pro-search",
    key: ctx.userId,
    limit: 30,
    windowMs: 60_000,
  });
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < PRO_SEARCH_MIN_CHARS) {
    return NextResponse.json({ professionals: [], minChars: PRO_SEARCH_MIN_CHARS });
  }

  const professionals = await searchPlatformProfessionals({
    q,
    patientUserId: ctx.userId,
  });

  return NextResponse.json({ professionals });
}
