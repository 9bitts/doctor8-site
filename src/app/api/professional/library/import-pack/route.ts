import { NextRequest, NextResponse } from "next/server";
import { type Lang } from "@/lib/i18n/translations";
import { requireLibraryAuth, importPlatformPack } from "@/lib/professional-library";
import { z } from "zod";

const schema = z.object({
  packId: z.string().min(1),
  lang: z.enum(["pt", "en", "es"]).optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireLibraryAuth();
  if (!ctx.ok) return ctx.error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const lang = (parsed.data.lang ?? "pt") as Lang;
  const result = await importPlatformPack(ctx, parsed.data.packId, lang);
  if ("error" in result) {
    const status = result.error === "ALREADY_IMPORTED" ? 409 : 404;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result, { status: 201 });
}
