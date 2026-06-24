import { NextResponse } from "next/server";
import { getPublicReviewsForSlug } from "@/lib/public-reviews";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const data = await getPublicReviewsForSlug(params.slug);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
