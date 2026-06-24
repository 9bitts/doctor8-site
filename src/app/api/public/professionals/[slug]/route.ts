// Public read-only profile by slug (no auth).

import { NextResponse } from "next/server";
import { getLivePublicProfileBySlug } from "@/lib/public-profile";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const profile = await getLivePublicProfileBySlug(params.slug);
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ profile });
}
