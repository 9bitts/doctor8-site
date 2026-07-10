// POST — transcribe consult audio + generate structured evolution draft (Phase 5).

import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { normalizeLang } from "@/lib/i18n/translations";
import { saveChartEvolution } from "@/lib/save-chart-evolution";
import {
  aiConsultNotesStatusPayload,
  buildAiConsultSummary,
  mapAiConsultNotesError,
  parseAiConsultNotesRequest,
  resolveAiConsultTranscript,
} from "@/lib/ai-consult-notes-request";

function evolutionTitle(lang: "pt" | "en" | "es"): string {
  if (lang === "pt") return "Evolução — teleconsulta";
  if (lang === "es") return "Evolución — teleconsulta";
  return "Evolution — teleconsult";
}

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

async function verifyPatientRecord(professionalId: string, recordId: string) {
  return db.patientRecord.findFirst({
    where: { id: recordId, professionalId },
    select: { id: true, firstName: true, lastName: true },
  });
}

async function verifyAppointment(professionalUserId: string, appointmentId: string) {
  const appt = await db.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, professional: { select: { userId: true } } },
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

    const input = await parseAiConsultNotesRequest(req, {
      defaultLang: normalizeLang(user?.language),
      recordFieldName: "patientRecordId",
    });

    if (input.recordId) {
      const record = await verifyPatientRecord(ctx.professional.id, input.recordId);
      if (!record) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (input.appointmentId) {
      const appt = await verifyAppointment(ctx.userId, input.appointmentId);
      if (!appt) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await createAuditLog({
      userId: ctx.userId,
      action: AuditAction.CREATE_RECORD,
      resource: "ConsultNotesConsent",
      resourceId: input.recordId || input.appointmentId || ctx.professional.id,
      details: {
        appointmentId: input.appointmentId,
        hasAudio: !!input.audioBuffer,
        hasTranscript: !!input.transcript,
      },
    });

    let patientName: string | null = null;
    if (input.recordId) {
      const record = await db.patientRecord.findUnique({
        where: { id: input.recordId },
        select: { firstName: true, lastName: true },
      });
      if (record) {
        patientName = `${safeDecrypt(record.firstName)} ${safeDecrypt(record.lastName)}`.trim();
      }
    }

    const transcript = await resolveAiConsultTranscript(input);
    const summary = await buildAiConsultSummary(input.lang, transcript, patientName);

    let documentId: string | undefined;
    if (input.saveToChart) {
      if (!input.recordId) {
        return NextResponse.json({ error: "NO_PATIENT_RECORD" }, { status: 400 });
      }
      const doc = await saveChartEvolution({
        professionalId: ctx.professional.id,
        patientRecordId: input.recordId,
        title: evolutionTitle(input.lang),
        content: summary,
      });
      documentId = doc.id;
    }

    return NextResponse.json({ transcript, summary, saved: !!documentId, documentId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "INVALID_REQUEST") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const mapped = mapAiConsultNotesError(msg);
    if (mapped.status !== 500) {
      return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    }
    console.error("[AI-CONSULT-NOTES]", e);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}

export async function GET() {
  return NextResponse.json(aiConsultNotesStatusPayload());
}
