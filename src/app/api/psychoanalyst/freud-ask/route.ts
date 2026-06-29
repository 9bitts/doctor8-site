import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePsychoanalyst } from "@/lib/psychoanalyst-api";
import { askFreud } from "@/lib/ai-freud";
import { normalizeLang } from "@/lib/i18n/translations";

const schema = z.object({
  question: z.string().min(3).max(2000),
  lang: z.enum(["pt", "en", "es"]).optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx) return ctx.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const lang = normalizeLang(parsed.data.lang || "pt");

  try {
    const answer = await askFreud({ lang, question: parsed.data.question });
    return NextResponse.json({ answer });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "AI_NOT_CONFIGURED") {
      return NextResponse.json({ error: "AI_NOT_CONFIGURED" }, { status: 503 });
    }
    if (msg === "NO_QUESTION") {
      return NextResponse.json({ error: "NO_QUESTION" }, { status: 400 });
    }
    return NextResponse.json({ error: "AI_REQUEST_FAILED" }, { status: 502 });
  }
}
