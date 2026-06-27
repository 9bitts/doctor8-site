// Structured consult evolution from transcript (Phase 5).

import { Lang } from "@/lib/i18n/translations";

const LANG_LABEL: Record<Lang, string> = {
  pt: "Portuguese (Brazil)",
  en: "English",
  es: "Spanish",
};

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
  return `You are a clinical documentation assistant helping a licensed physician draft a consultation evolution note for their EHR (Doctor8).

From the consultation transcript (which may be partial or noisy), produce a structured evolution draft with EXACTLY these markdown sections:

${sections}

Rules:
- Write entirely in ${LANG_LABEL[lang]}.
- Use only information reasonably supported by the transcript; if a section has no data, write "Não informado" / "Not documented" / "No documentado" as appropriate.
- Use professional clinical language suitable for a medical record.
- Do NOT invent diagnoses, prescriptions, or test results not mentioned.
- Keep each section concise (1?4 sentences unless rich detail is present).
- This is a DRAFT for physician review ? not a final medical record.`;
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
    "Consultation transcript:",
    trimmed,
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
      max_tokens: 1200,
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
