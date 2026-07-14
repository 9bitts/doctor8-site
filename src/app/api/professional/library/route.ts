import { NextRequest, NextResponse } from "next/server";
import { requireLibraryAuth, getLibraryHub } from "@/lib/professional-library";

export async function GET(req: NextRequest) {
  const ctx = await requireLibraryAuth();
  if (!ctx.ok) return ctx.error;

  const langParam = req.nextUrl.searchParams.get("lang");
  const lang = langParam === "en" || langParam === "es" || langParam === "pt" ? langParam : "pt";
  const hub = await getLibraryHub(ctx, lang);
  return NextResponse.json(hub);
}
