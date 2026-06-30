// Structured consult evolution from transcript (Phase 5).

import { Lang } from "@/lib/i18n/translations";
import {
  consultNotesExcellenceGuide,
  LANG_LABEL,
  notDocumentedLabel,
} from "@/lib/ai-clinical-standards";

const SECTION_HEADINGS: Record<Lang, string[]> = {
  pt: [
    "Queixa principal",
    "História da doença atual (HDA)",
    "Exame / achados",
    "Plano terapêutico",
    "Orientações ao paciente",
  ],
  en: [
    "Chief complaint",
    "History of present illness (HPI)",
    "Examination / findings",
    "Treatment plan",
    "Patient instructions",
  ],
  es: [
    "Motivo de consulta",
    "Historia de la enfermedad actual (HEA)",
    "Examen / hallazgos",
    "Plan terapéutico",
    "Orientaciones al paciente",
  ],
};

function buildConsultSystemPrompt(lang: Lang): string {
  const sections = SECTION_HEADINGS[lang].map((s) => `## ${s}`).join("\n");
  const emptyLabel = notDocumentedLabel(lang);

  return `You are an ambient clinical documentation assistant helping a licensed physician draft a consultation evolution note for Doctor8 (EHR).

Your output helps the clinician save time — like Abridge or Dragon Copilot — but the physician MUST review and edit before saving. You are not the author of record.

Produce a structured evolution DRAFT with EXACTLY these markdown sections (keep headings verbatim):

${sections}

${consultNotesExcellenceGuide(lang)}

OUTPUT RULES:
- Write entirely in ${LANG_LABEL[lang]}.
- If a section has no transcript data, write exactly: "${emptyLabel}".
- Preserve drug names, dosages, and measurements exactly as spoken when present.
- End with no disclaimer block — the UI already shows this is a draft.`;
}

export async function generateConsultEvolution(params: {
  lang: Lang;
  transcript: string;
  patientName?: string | null;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("AI_NOT_CONFIGURED");

  const trimmed = params.transcript.trim();
  if (!trimmed) throw new Error("NO_TRANSCRIPT");

  const userText = [
    params.patientName ? `Patient: ${params.patientName}` : "",
    "Consultation transcript (may be partial, noisy, or multilingual):",
    trimmed,
    "",
    "Generate the evolution draft from the transcript above.",
  ].filter(Boolean).join("\n\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1400,
      system: buildConsultSystemPrompt(params.lang),
      messages: [{ role: "user", content: userText }],
    }),
  });

  if (!response.ok) {
    console.error("[AI-CONSULT-NOTES]", await response.text());
    throw new Error("AI_REQUEST_FAILED");
  }

  const data = await response.json();
  const text = data.content?.find((b: { type: string }) => b.type === "text")?.text;
  if (!text) throw new Error("AI_EMPTY_RESPONSE");
  return text.trim();
}

export const CONSULT_DRAFT_STORAGE_KEY = "doctor8:consultDraft:";

export function consultDraftKey(patientRecordId: string): string {
  return `${CONSULT_DRAFT_STORAGE_KEY}${patientRecordId}`;
}
