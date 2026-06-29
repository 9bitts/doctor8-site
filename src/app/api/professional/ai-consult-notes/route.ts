// POST ? transcribe consult audio + generate structured evolution draft (Phase 5).
// Requires explicit consent flag. Audio via Whisper (OPENAI_API_KEY) or plain transcript text.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { transcribeAudio, isTranscribeConfigured } from "@/lib/ai-transcribe";
import { generateConsultEvolution } from "@/lib/ai-consult-notes";
import { normalizeLang, Lang } from "@/lib/i18n/translations";
import { saveChartEvolution } from "@/lib/save-chart-evolution";

function evolutionTitle(lang: Lang): string {
  if (lang === "pt") return "Evolução — teleconsulta";
  if (lang === "es") return "Evolución — teleconsulta";
  return "Evolution — teleconsult";
}

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

const jsonSchema = z.object({
  consent: z.literal(true),
  transcript: z.string().min(1).optional(),
  lang: z.enum(["pt", "en", "es"]).optional(),
  patientRecordId: z.string().optional(),
  appointmentId: z.string().optional(),
  saveToChart: z.boolean().optional(),
});

async function verifyPatientRecord(professionalId: string, recordId: string) {
  return db.patientRecord.findFirst({
    where: { id: recordId, professionalId },
    select: { id: true, firstName: true, lastName: true },
  });
}

async function verifyAppointment(professionalUserId: string, appointmentId: string) {
  const appt = await db.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      professional: { select: { userId: true } },
    },
  });
  if (!appt?.professional || appt.professional.userId !== professionalUserId) return null;
  return appt;
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireProfessionalApi();
    if (isApiError(ctx)) return ctx.error;

    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { language: true },
    });

    const contentType = req.headers.get("content-type") || "";
    let lang: Lang = normalizeLang(user?.language);
    let patientRecordId: string | undefined;
    let appointmentId: string | undefined;
    let transcript: string | undefined;
    let saveToChart = false;
    let audioBuffer: Buffer | null = null;
    let audioMime = "audio/webm";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const consent = form.get("consent");
      if (consent !== "true") {
        return NextResponse.json({ error: "CONSENT_REQUIRED" }, { status: 400 });
      }

      const langRaw = form.get("lang");
      if (typeof langRaw === "string" && ["pt", "en", "es"].includes(langRaw)) {
        lang = langRaw as Lang;
      }

      const prId = form.get("patientRecordId");
      if (typeof prId === "string" && prId) patientRecordId = prId;

      const apptId = form.get("appointmentId");
      if (typeof apptId === "string" && apptId) appointmentId = apptId;

      const transcriptField = form.get("transcript");
      if (typeof transcriptField === "string" && transcriptField.trim()) {
        transcript = transcriptField.trim();
      }

      const saveField = form.get("saveToChart");
      if (saveField === "true") saveToChart = true;

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
      patientRecordId = parsed.data.patientRecordId;
      appointmentId = parsed.data.appointmentId;
      transcript = parsed.data.transcript;
      saveToChart = !!parsed.data.saveToChart;
    }

    if (patientRecordId) {
      const record = await verifyPatientRecord(ctx.professional.id, patientRecordId);
      if (!record) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (appointmentId) {
      const appt = await verifyAppointment(ctx.userId, appointmentId);
      if (!appt) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await createAuditLog({
      userId: ctx.userId,
      action: AuditAction.CREATE_RECORD,
      resource: "ConsultNotesConsent",
      resourceId: patientRecordId || appointmentId || ctx.professional.id,
      details: {
        appointmentId,
        hasAudio: !!audioBuffer,
        hasTranscript: !!transcript,
      },
    });

    let patientName: string | null = null;
    if (patientRecordId) {
      const record = await db.patientRecord.findUnique({
        where: { id: patientRecordId },
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
      if (!patientRecordId) {
        return NextResponse.json({ error: "NO_PATIENT_RECORD" }, { status: 400 });
      }
      const doc = await saveChartEvolution({
        professionalId: ctx.professional.id,
        patientRecordId,
        title: evolutionTitle(lang),
        content: summary,
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
    console.error("[AI-CONSULT-NOTES]", e);
    return NextResponse.json({ error: "AI_FAILED" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    transcribeConfigured: isTranscribeConfigured(),
    summarizeConfigured: !!process.env.ANTHROPIC_API_KEY,
  });
}
