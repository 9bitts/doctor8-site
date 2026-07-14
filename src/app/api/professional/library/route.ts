import { NextRequest, NextResponse } from "next/server";
import { type Lang } from "@/lib/i18n/translations";
import { requireLibraryAuth, getLibraryHub } from "@/lib/professional-library";

function parseLang(value: string | null): Lang {
  if (value === "en" || value === "es" || value === "pt") return value;
  return "pt";
}

export async function GET(req: NextRequest) {
  const ctx = await requireLibraryAuth();
  if (!ctx.ok) return ctx.error;

  const lang = parseLang(req.nextUrl.searchParams.get("lang"));
  const hub = await getLibraryHub(ctx, lang);
  return NextResponse.json(hub);
}
