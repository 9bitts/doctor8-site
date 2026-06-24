import { NextRequest, NextResponse } from "next/server";
import { recordPublicProfileEvent } from "@/lib/public-analytics";
import { z } from "zod";

const schema = z.object({
  type: z.enum(["view", "book_click"]),
  source: z.enum(["public_profile", "public_search"]).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const type = parsed.data.type === "view" ? "VIEW" : "BOOK_CLICK";
  const ok = await recordPublicProfileEvent(
    params.slug,
    type,
    parsed.data.source
  );

  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
