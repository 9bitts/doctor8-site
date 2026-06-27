import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { transcribeAudio, isTranscribeConfigured } from "@/lib/ai-transcribe";
import { generateConsultEvolution } from "@/lib/ai-consult-notes";
import { normalizeLang, Lang } from "@/lib/i18n/translations";
import { requirePsychoanalyst, safeDecrypt } from "@/lib/psychoanalyst-api";
import { savePsychoanalystSessionNote } from "@/lib/save-psychoanalyst-session-note";

function evolutionTitle(lang: Lang): string {
  if (lang === "pt") return "Evolu\u00e7\u00e3o \u2014 teleconsulta";
  if (lang === "es") return "Evoluci\u00f3n \u2014 teleconsulta";
  return "Evolution \u2014 teleconsult";
}

const jsonSchema = z.object({
  consent: z.literal(true),
  transcript: z.string().min(1).optional(),
  lang: z.enum(["pt", "en", "es"]).optional(),
  analysandRecordId: z.string().optional(),
  appointmentId: z.string().optional(),
  saveToChart: z.boolean().optional(),
});

async function verifyAnalysand(psychoanalystId: string, analysandRecordId: string) {
  return db.analysandRecord.findFirst({
    where: { id: analysandRecordId, psychoanalystId },
    select: { id: true, firstName: true, lastName: true },
  });
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePsychoanalyst();
    if ("error" in ctx && ctx.error) return ctx.error;
    const { psychoanalyst } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

    const user = await db.user.findUnique({
      where: { id: psychoanalyst.userId },
      select: { language: true },
    });

    const contentType = req.headers.get("content-type") || "";
    let lang: Lang = normalizeLang(user?.language);
    let analysandRecordId: string | undefined;
    let appointmentId: string | undefined;
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

      const arId = form.get("analysandRecordId");
      if (typeof arId === "string" && arId) analysandRecordId = arId;

      const apptId = form.get("appointmentId");
      if (typeof apptId === "string" && apptId) appointmentId = apptId;

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
      analysandRecordId = parsed.data.analysandRecordId;
      appointmentId = parsed.data.appointmentId;
      transcript = parsed.data.transcript;
      saveToChart = !!parsed.data.saveToChart;
    }

    if (analysandRecordId) {
      const record = await verifyAnalysand(psychoanalyst.id, analysandRecordId);
      if (!record) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await createAuditLog({
      userId: psychoanalyst.userId,
      action: AuditAction.CREATE_RECORD,
      resource: "ConsultNotesConsent",
      resourceId: analysandRecordId || appointmentId || psychoanalyst.id,
      details: {
        appointmentId,
        hasAudio: !!audioBuffer,
        hasTranscript: !!transcript,
        provider: "psychoanalyst",
      },
    });

    let patientName: string | null = null;
    if (analysandRecordId) {
      const record = await db.analysandRecord.findUnique({
        where: { id: analysandRecordId },
        select: { firstName: true, lastName: true },
      });
      if (record) {
        patientName = `${safeDecrypt(record.firstName)} ${safeDecrypt(record.lastName)}`.trim();
      }
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
      if (!analysandRecordId) {
        return NextResponse.json({ error: "NO_ANALYSAND_RECORD" }, { status: 400 });
      }
      const doc = await savePsychoanalystSessionNote({
        psychoanalystId: psychoanalyst.id,
        analysandRecordId,
        title: evolutionTitle(lang),
        content: summary,
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
    console.error("[PSYCHO-AI-CONSULT-NOTES]", e);
    return NextResponse.json({ error: "AI_FAILED" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    transcribeConfigured: isTranscribeConfigured(),
    summarizeConfigured: !!process.env.ANTHROPIC_API_KEY,
  });
}
