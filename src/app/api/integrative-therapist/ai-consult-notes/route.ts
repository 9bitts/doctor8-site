import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { normalizeLang } from "@/lib/i18n/translations";
import { requireIntegrativeTherapist, safeDecrypt } from "@/lib/integrative-therapist-api";
import { saveIntegrativeSessionNote } from "@/lib/save-integrative-session-note";
import {
  aiConsultNotesStatusPayload,
  buildAiConsultSummary,
  mapAiConsultNotesError,
  parseAiConsultNotesRequest,
  resolveAiConsultTranscript,
} from "@/lib/ai-consult-notes-request";

function evolutionTitle(lang: "pt" | "en" | "es"): string {
  if (lang === "pt") return "Evolução — consulta integrativa";
  if (lang === "es") return "Evolución — consulta integrativa";
  return "Evolution — integrative consult";
}

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

    const input = await parseAiConsultNotesRequest(req, {
      defaultLang: normalizeLang(user?.language),
      recordFieldName: "integrativeClientRecordId",
      includePracticeSlug: true,
    });

    let clientRecord: Awaited<ReturnType<typeof verifyClient>> = null;
    if (input.recordId) {
      clientRecord = await verifyClient(therapist.id, input.recordId);
      if (!clientRecord) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await createAuditLog({
      userId: therapist.userId,
      action: AuditAction.CREATE_RECORD,
      resource: "ConsultNotesConsent",
      resourceId: input.recordId || input.appointmentId || therapist.id,
      details: {
        appointmentId: input.appointmentId,
        hasAudio: !!input.audioBuffer,
        hasTranscript: !!input.transcript,
        provider: "integrative_therapist",
      },
    });

    const patientName = clientRecord
      ? `${safeDecrypt(clientRecord.firstName)} ${safeDecrypt(clientRecord.lastName)}`.trim()
      : null;

    const transcript = await resolveAiConsultTranscript(input);
    const summary = await buildAiConsultSummary(input.lang, transcript, patientName);

    let documentId: string | undefined;
    if (input.saveToChart) {
      if (!input.recordId) {
        return NextResponse.json({ error: "NO_CLIENT_RECORD" }, { status: 400 });
      }
      const doc = await saveIntegrativeSessionNote({
        integrativeTherapistId: therapist.id,
        integrativeClientRecordId: input.recordId,
        content: summary,
        practiceSlug: input.practiceSlug || clientRecord?.mainPractice,
        title: evolutionTitle(input.lang),
        appointmentId: input.appointmentId,
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
    console.error("[IT-AI-CONSULT-NOTES]", e);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}

export async function GET() {
  return NextResponse.json(aiConsultNotesStatusPayload());
}
