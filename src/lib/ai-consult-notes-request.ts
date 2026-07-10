import { NextRequest } from "next/server";
import { z } from "zod";
import { normalizeLang, type Lang } from "@/lib/i18n/translations";
import { isTranscribeConfigured, transcribeAudio } from "@/lib/ai-transcribe";
import { generateConsultEvolution } from "@/lib/ai-consult-notes";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export const aiConsultNotesJsonSchema = z.object({
  consent: z.literal(true),
  transcript: z.string().min(1).optional(),
  lang: z.enum(["pt", "en", "es"]).optional(),
  appointmentId: z.string().optional(),
  saveToChart: z.boolean().optional(),
});

export type AiConsultNotesInput = {
  lang: Lang;
  appointmentId?: string;
  transcript?: string;
  saveToChart: boolean;
  audioBuffer: Buffer | null;
  audioMime: string;
  recordId?: string;
  practiceSlug?: string;
};

export type ParseAiConsultNotesOptions = {
  defaultLang: Lang;
  recordFieldName: string;
  includePracticeSlug?: boolean;
};

export async function parseAiConsultNotesRequest(
  req: NextRequest,
  opts: ParseAiConsultNotesOptions,
): Promise<AiConsultNotesInput> {
  const contentType = req.headers.get("content-type") || "";
  let lang = opts.defaultLang;
  let appointmentId: string | undefined;
  let transcript: string | undefined;
  let saveToChart = false;
  let audioBuffer: Buffer | null = null;
  let audioMime = "audio/webm";
  let recordId: string | undefined;
  let practiceSlug: string | undefined;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    if (form.get("consent") !== "true") {
      throw new Error("CONSENT_REQUIRED");
    }

    const langRaw = form.get("lang");
    if (typeof langRaw === "string" && ["pt", "en", "es"].includes(langRaw)) {
      lang = langRaw as Lang;
    }

    const recordField = form.get(opts.recordFieldName);
    if (typeof recordField === "string" && recordField) recordId = recordField;

    const apptId = form.get("appointmentId");
    if (typeof apptId === "string" && apptId) appointmentId = apptId;

    if (opts.includePracticeSlug) {
      const practice = form.get("practiceSlug");
      if (typeof practice === "string" && practice) practiceSlug = practice;
    }

    const transcriptField = form.get("transcript");
    if (typeof transcriptField === "string" && transcriptField.trim()) {
      transcript = transcriptField.trim();
    }

    if (form.get("saveToChart") === "true") saveToChart = true;

    const audio = form.get("audio");
    if (audio instanceof File && audio.size > 0) {
      if (audio.size > MAX_AUDIO_BYTES) throw new Error("AUDIO_TOO_LARGE");
      audioBuffer = Buffer.from(await audio.arrayBuffer());
      audioMime = audio.type || "audio/webm";
    }
  } else {
    const schema = aiConsultNotesJsonSchema.extend({
      [opts.recordFieldName]: z.string().optional(),
      ...(opts.includePracticeSlug ? { practiceSlug: z.string().optional() } : {}),
    });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new Error("INVALID_REQUEST");

    const data = parsed.data as z.infer<typeof aiConsultNotesJsonSchema> & Record<string, unknown>;
    lang = normalizeLang((data.lang as Lang | undefined) || lang);
    appointmentId = data.appointmentId;
    transcript = data.transcript;
    saveToChart = !!data.saveToChart;
    const rawRecord = data[opts.recordFieldName];
    if (typeof rawRecord === "string" && rawRecord) recordId = rawRecord;
    if (opts.includePracticeSlug && typeof data.practiceSlug === "string") {
      practiceSlug = data.practiceSlug;
    }
  }

  return { lang, appointmentId, transcript, saveToChart, audioBuffer, audioMime, recordId, practiceSlug };
}

export async function resolveAiConsultTranscript(
  input: Pick<AiConsultNotesInput, "lang" | "transcript" | "audioBuffer" | "audioMime">,
): Promise<string> {
  let transcript = input.transcript;
  if (!transcript && input.audioBuffer) {
    if (!isTranscribeConfigured()) throw new Error("TRANSCRIBE_NOT_CONFIGURED");
    transcript = await transcribeAudio(input.audioBuffer, input.audioMime, input.lang);
  }
  if (!transcript?.trim()) throw new Error("NO_TRANSCRIPT");
  return transcript;
}

export async function buildAiConsultSummary(
  lang: Lang,
  transcript: string,
  patientName: string | null,
): Promise<string> {
  return generateConsultEvolution({ lang, transcript, patientName });
}

export function aiConsultNotesStatusPayload() {
  return {
    transcribeConfigured: isTranscribeConfigured(),
    summarizeConfigured: !!process.env.ANTHROPIC_API_KEY,
  };
}

export function mapAiConsultNotesError(msg: string): { error: string; status: number } {
  if (msg === "CONSENT_REQUIRED" || msg === "INVALID_REQUEST") {
    return { error: msg === "CONSENT_REQUIRED" ? "CONSENT_REQUIRED" : "Invalid request", status: 400 };
  }
  if (msg === "AI_NOT_CONFIGURED" || msg === "TRANSCRIBE_NOT_CONFIGURED") {
    return { error: msg, status: 503 };
  }
  if (msg === "NO_TRANSCRIPT" || msg === "TRANSCRIBE_EMPTY" || msg === "AUDIO_TOO_LARGE") {
    return { error: msg, status: 400 };
  }
  return { error: "AI_FAILED", status: 500 };
}
