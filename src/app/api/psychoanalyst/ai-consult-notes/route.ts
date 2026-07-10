import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { normalizeLang } from "@/lib/i18n/translations";
import { requirePsychoanalyst, safeDecrypt } from "@/lib/psychoanalyst-api";
import { savePsychoanalystSessionNote } from "@/lib/save-psychoanalyst-session-note";
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

    const input = await parseAiConsultNotesRequest(req, {
      defaultLang: normalizeLang(user?.language),
      recordFieldName: "analysandRecordId",
    });

    if (input.recordId) {
      const record = await verifyAnalysand(psychoanalyst.id, input.recordId);
      if (!record) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await createAuditLog({
      userId: psychoanalyst.userId,
      action: AuditAction.CREATE_RECORD,
      resource: "ConsultNotesConsent",
      resourceId: input.recordId || input.appointmentId || psychoanalyst.id,
      details: {
        appointmentId: input.appointmentId,
        hasAudio: !!input.audioBuffer,
        hasTranscript: !!input.transcript,
        provider: "psychoanalyst",
      },
    });

    let patientName: string | null = null;
    if (input.recordId) {
      const record = await db.analysandRecord.findUnique({
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
        return NextResponse.json({ error: "NO_ANALYSAND_RECORD" }, { status: 400 });
      }
      const doc = await savePsychoanalystSessionNote({
        psychoanalystId: psychoanalyst.id,
        analysandRecordId: input.recordId,
        title: evolutionTitle(input.lang),
        content: summary,
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
    console.error("[PSYCHO-AI-CONSULT-NOTES]", e);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}

export async function GET() {
  return NextResponse.json(aiConsultNotesStatusPayload());
}
