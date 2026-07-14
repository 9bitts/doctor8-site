// POST — lightweight audio-to-text for inline dictation fields.

import { NextRequest, NextResponse } from "next/server";
import { isApiError } from "@/lib/api-auth";
import { requireLiteratureSearchApi } from "@/lib/literature-search-auth";
import { isTranscribeConfigured, transcribeAudio } from "@/lib/ai-transcribe";
import { normalizeLang, type Lang } from "@/lib/i18n/translations";
import { db } from "@/lib/db";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

export async function GET() {
  return NextResponse.json({ configured: isTranscribeConfigured() });
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireLiteratureSearchApi();
    if (isApiError(ctx)) return ctx.error;

    if (!isTranscribeConfigured()) {
      return NextResponse.json({ error: "TRANSCRIBE_NOT_CONFIGURED" }, { status: 503 });
    }

    const form = await req.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ error: "NO_AUDIO" }, { status: 400 });
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "AUDIO_TOO_LARGE" }, { status: 400 });
    }

    const langRaw = form.get("lang");
    let lang: Lang = "pt";
    if (typeof langRaw === "string" && ["pt", "en", "es"].includes(langRaw)) {
      lang = langRaw as Lang;
    } else {
      const user = await db.user.findUnique({
        where: { id: ctx.userId },
        select: { language: true },
      });
      lang = normalizeLang(user?.language);
    }

    const audioBuffer = Buffer.from(await audio.arrayBuffer());
    const transcript = await transcribeAudio(audioBuffer, audio.type || "audio/webm", lang);
    return NextResponse.json({ transcript });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "TRANSCRIBE_NOT_CONFIGURED") {
      return NextResponse.json({ error: "TRANSCRIBE_NOT_CONFIGURED" }, { status: 503 });
    }
    if (msg === "TRANSCRIBE_EMPTY") {
      return NextResponse.json({ error: "TRANSCRIBE_EMPTY" }, { status: 422 });
    }
    console.error("[TRANSCRIBE]", e);
    return NextResponse.json({ error: "TRANSCRIBE_FAILED" }, { status: 500 });
  }
}
