import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isApiError } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { transcribeAudio, isTranscribeConfigured } from "@/lib/ai-transcribe";
import { normalizeLang, type Lang } from "@/lib/i18n/translations";
import { processVoiceCommand } from "@/lib/voice-assistant/process-voice-command";
import { requireVoiceAssistantApi } from "@/lib/voice-assistant/voice-assistant-auth";
import type { VoicePortalId, VoiceProcessResult } from "@/lib/voice-assistant/types";

const portalIds = [
  "PROFESSIONAL",
  "PSYCHOLOGIST",
  "NUTRITIONIST",
  "NURSE",
  "PHARMACIST",
  "DENTIST",
  "PSYCHOANALYST",
  "INTEGRATIVE_THERAPIST",
] as const;

const jsonSchema = z.object({
  consent: z.literal(true),
  transcript: z.string().min(1).optional(),
  lang: z.enum(["pt", "en", "es"]).optional(),
  portalId: z.enum(portalIds),
  pathname: z.string().optional(),
  sessionPatientRecordId: z.string().optional(),
  /** transcribe = STT only; process = interpret (default). */
  mode: z.enum(["transcribe", "process"]).optional(),
});

function transcriptReadyMessage(lang: Lang): string {
  if (lang === "es") return "Transcripción lista. Revise el texto antes de continuar.";
  if (lang === "en") return "Transcript ready. Review the text before continuing.";
  return "Transcrição pronta. Confira o texto antes de continuar.";
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let lang: Lang = "pt";
    let portalId: VoicePortalId = "PROFESSIONAL";
    let pathname: string | undefined;
    let sessionPatientRecordId: string | undefined;
    let transcript: string | undefined;
    let mode: "transcribe" | "process" = "process";
    let audioBuffer: Buffer | null = null;
    let audioMime = "audio/webm";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      if (form.get("consent") !== "true") {
        return NextResponse.json({ error: "CONSENT_REQUIRED" }, { status: 400 });
      }

      const portalRaw = form.get("portalId");
      if (typeof portalRaw !== "string" || !portalIds.includes(portalRaw as VoicePortalId)) {
        return NextResponse.json({ error: "INVALID_PORTAL" }, { status: 400 });
      }
      portalId = portalRaw as VoicePortalId;

      const langRaw = form.get("lang");
      if (typeof langRaw === "string") lang = normalizeLang(langRaw);

      const pathRaw = form.get("pathname");
      if (typeof pathRaw === "string") pathname = pathRaw;

      const sessionRaw = form.get("sessionPatientRecordId");
      if (typeof sessionRaw === "string" && sessionRaw) sessionPatientRecordId = sessionRaw;

      const modeRaw = form.get("mode");
      if (modeRaw === "transcribe" || modeRaw === "process") mode = modeRaw;

      const transcriptField = form.get("transcript");
      if (typeof transcriptField === "string" && transcriptField.trim()) {
        transcript = transcriptField.trim();
      }

      const audio = form.get("audio");
      if (audio instanceof Blob && audio.size > 0) {
        audioBuffer = Buffer.from(await audio.arrayBuffer());
        audioMime = audio.type || "audio/webm";
      }
    } else {
      const body = await req.json();
      const parsed = jsonSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }
      portalId = parsed.data.portalId;
      lang = normalizeLang(parsed.data.lang);
      pathname = parsed.data.pathname;
      sessionPatientRecordId = parsed.data.sessionPatientRecordId;
      transcript = parsed.data.transcript?.trim();
      mode = parsed.data.mode ?? "process";
    }

    const auth = await requireVoiceAssistantApi(portalId);
    if (isApiError(auth)) return auth.error;

    if (!transcript && audioBuffer) {
      if (!isTranscribeConfigured()) {
        return NextResponse.json({ error: "TRANSCRIBE_NOT_CONFIGURED" }, { status: 503 });
      }
      transcript = await transcribeAudio(audioBuffer, audioMime, lang);
    }

    if (!transcript?.trim()) {
      return NextResponse.json({ error: "NO_TRANSCRIPT" }, { status: 400 });
    }

    const trimmed = transcript.trim();

    if (mode === "transcribe") {
      const result: VoiceProcessResult = {
        action: "transcript_ready",
        message: transcriptReadyMessage(lang),
        transcript: trimmed,
        reviewText: trimmed,
      };
      await createAuditLog({
        userId: auth.userId,
        action: AuditAction.CREATE_RECORD,
        resource: "VoiceAssistant",
        details: {
          portalId,
          pathname,
          action: result.action,
          skillPreview: trimmed.slice(0, 200),
        },
      });
      return NextResponse.json(result);
    }

    const result = await processVoiceCommand({
      auth,
      lang,
      portalId,
      transcript: trimmed,
      pathname,
      sessionPatientRecordId,
    });

    await createAuditLog({
      userId: auth.userId,
      action: AuditAction.CREATE_RECORD,
      resource: "VoiceAssistant",
      details: {
        portalId,
        pathname,
        action: result.action,
        skillPreview: trimmed.slice(0, 200),
      },
    });

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "VOICE_ASSISTANT_ERROR";
    console.error("[VOICE-ASSISTANT]", e);
    if (msg === "AI_NOT_CONFIGURED" || msg === "TRANSCRIBE_NOT_CONFIGURED") {
      return NextResponse.json({ error: msg }, { status: 503 });
    }
    if (msg === "NO_TRANSCRIPT" || msg === "CONSENT_REQUIRED") {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: "VOICE_ASSISTANT_FAILED" }, { status: 502 });
  }
}
