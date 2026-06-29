import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { transcribeAudio, isTranscribeConfigured } from "@/lib/ai-transcribe";
import { generateConsultEvolution } from "@/lib/ai-consult-notes";
import { normalizeLang, Lang } from "@/lib/i18n/translations";
import { requireIntegrativeTherapist, safeDecrypt } from "@/lib/integrative-therapist-api";
import { saveIntegrativeSessionNote } from "@/lib/save-integrative-session-note";

function evolutionTitle(lang: Lang): string {
  if (lang === "pt") return "Evolu\u00e7\u00e3o \u2014 consulta integrativa";
  if (lang === "es") return "Evoluci\u00f3n \u2014 consulta integrativa";
  return "Evolution \u2014 integrative consult";
}

const jsonSchema = z.object({
  consent: z.literal(true),
  transcript: z.string().min(1).optional(),
  lang: z.enum(["pt", "en", "es"]).optional(),
  integrativeClientRecordId: z.string().optional(),
  appointmentId: z.string().optional(),
  practiceSlug: z.string().optional(),
  saveToChart: z.boolean().optional(),
});

async function verifyClient(therapistId: string, clientRecordId: string) {
  return db.integrativeClientRecord.findFirst({
    where: { id: clientRecordId, integrativeTherapistId: therapistId },
    select: { id: true, firstName: true, lastName: true, mainPractice: true },
  });
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireIntegrativeTherapist();
    if ("error" in ctx && ctx.error) return ctx.error;
    const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

    const user = await db.user.findUnique({
      where: { id: therapist.userId },
      select: { language: true },
    });

    const contentType = req.headers.get("content-type") || "";
    let lang: Lang = normalizeLang(user?.language);
    let integrativeClientRecordId: string | undefined;
    let appointmentId: string | undefined;
    let practiceSlug: string | undefined;
    let transcript: string | undefined;
    let saveToChart = false;
    let audioBuffer: Buffer | null = null;
    let audioMime = "audio/webm";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      if (form.get("consent") !== "true") {
        return NextResponse.json({ error: "CONSENT_REQUIRED" }, { status: 400 });
      }

      const langRaw = form.get("lang");
      if (typeof langRaw === "string" && ["pt", "en", "es"].includes(langRaw)) {
        lang = langRaw as Lang;
      }

      const clientId = form.get("integrativeClientRecordId");
      if (typeof clientId === "string" && clientId) integrativeClientRecordId = clientId;

      const apptId = form.get("appointmentId");
      if (typeof apptId === "string" && apptId) appointmentId = apptId;

      const practice = form.get("practiceSlug");
      if (typeof practice === "string" && practice) practiceSlug = practice;

      const transcriptField = form.get("transcript");
      if (typeof transcriptField === "string" && transcriptField.trim()) {
        transcript = transcriptField.trim();
      }

      if (form.get("saveToChart") === "true") saveToChart = true;

      const audio = form.get("audio");
      if (audio instanceof File && audio.size > 0) {
        if (audio.size > 25 * 1024 * 1024) {
          return NextResponse.json({ error: "AUDIO_TOO_LARGE" }, { status: 400 });
        }
        audioBuffer = Buffer.from(await audio.arrayBuffer());
        audioMime = audio.type || "audio/webm";
      }
    } else {
      const body = await req.json();
      const parsed = jsonSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
      }
      lang = normalizeLang(parsed.data.lang || lang);
      integrativeClientRecordId = parsed.data.integrativeClientRecordId;
      appointmentId = parsed.data.appointmentId;
      practiceSlug = parsed.data.practiceSlug;
      transcript = parsed.data.transcript;
      saveToChart = !!parsed.data.saveToChart;
    }

    let clientRecord: Awaited<ReturnType<typeof verifyClient>> = null;
    if (integrativeClientRecordId) {
      clientRecord = await verifyClient(therapist.id, integrativeClientRecordId);
      if (!clientRecord) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await createAuditLog({
      userId: therapist.userId,
      action: AuditAction.CREATE_RECORD,
      resource: "ConsultNotesConsent",
      resourceId: integrativeClientRecordId || appointmentId || therapist.id,
      details: {
        appointmentId,
        hasAudio: !!audioBuffer,
        hasTranscript: !!transcript,
        provider: "integrative_therapist",
      },
    });

    let patientName: string | null = null;
    if (clientRecord) {
      patientName = `${safeDecrypt(clientRecord.firstName)} ${safeDecrypt(clientRecord.lastName)}`.trim();
    }

    if (!transcript && audioBuffer) {
      if (!isTranscribeConfigured()) {
        return NextResponse.json({ error: "TRANSCRIBE_NOT_CONFIGURED" }, { status: 503 });
      }
      transcript = await transcribeAudio(audioBuffer, audioMime, lang);
    }

    if (!transcript?.trim()) {
      return NextResponse.json({ error: "NO_TRANSCRIPT" }, { status: 400 });
    }

    const summary = await generateConsultEvolution({
      lang,
      transcript,
      patientName,
    });

    let documentId: string | undefined;
    if (saveToChart) {
      if (!integrativeClientRecordId) {
        return NextResponse.json({ error: "NO_CLIENT_RECORD" }, { status: 400 });
      }
      const doc = await saveIntegrativeSessionNote({
        integrativeTherapistId: therapist.id,
        integrativeClientRecordId,
        content: summary,
        practiceSlug: practiceSlug || clientRecord?.mainPractice,
        title: evolutionTitle(lang),
        appointmentId,
      });
      documentId = doc.id;
    }

    return NextResponse.json({ transcript, summary, saved: !!documentId, documentId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "AI_NOT_CONFIGURED" || msg === "TRANSCRIBE_NOT_CONFIGURED") {
      return NextResponse.json({ error: msg }, { status: 503 });
    }
    if (msg === "NO_TRANSCRIPT" || msg === "TRANSCRIBE_EMPTY") {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error("[IT-AI-CONSULT-NOTES]", e);
    return NextResponse.json({ error: "AI_FAILED" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    transcribeConfigured: isTranscribeConfigured(),
    summarizeConfigured: !!process.env.ANTHROPIC_API_KEY,
  });
}
