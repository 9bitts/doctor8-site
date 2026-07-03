import { NextRequest, NextResponse } from "next/server";
import { listPublicSpecialties } from "@/lib/public-search-catalog";
import { normalizeLang } from "@/lib/i18n/translations";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const lang = normalizeLang(req.nextUrl.searchParams.get("lang"));
  const specialties = await listPublicSpecialties(lang);
  return NextResponse.json({ specialties, lang });
}
