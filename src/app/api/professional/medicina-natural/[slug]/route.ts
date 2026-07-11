import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { getMedicinaNaturalItemBySlug } from "@/lib/medicina-natural-catalog/search-server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const { slug } = await params;
  if (!slug?.trim()) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  try {
    const item = await getMedicinaNaturalItemBySlug(slug);
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (err) {
    console.error("[medicina-natural/slug] professional:", err);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
