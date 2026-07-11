// AI-assisted psychology session note drafting (DAP, BIRP, SOAP, free-form).

import type { Lang } from "@/lib/i18n/translations";
import type { SessionFormat } from "@/lib/psychology-templates";
import { LANG_LABEL } from "@/lib/ai-clinical-standards";

const FORMAT_GUIDE: Record<SessionFormat, Record<Lang, string>> = {
  DAP: {
    pt: "Estruture em três seções: DADOS (fatos objetivos e relatos), AVALIAÇÃO (hipóteses e compreensão clínica), PLANO (intervenções e próximos passos).",
    en: "Structure in three sections: DATA (objective facts and reports), ASSESSMENT (hypotheses and clinical understanding), PLAN (interventions and next steps).",
    es: "Estructure en tres secciones: DATOS, EVALUACIÓN y PLAN.",
  },
  BIRP: {
    pt: "Estruture em: COMPORTAMENTO, INTERVENÇÃO, RESPOSTA e PLANEJAMENTO.",
    en: "Structure in: BEHAVIOR, INTERVENTION, RESPONSE, and PLAN.",
    es: "Estructure en: COMPORTAMIENTO, INTERVENCIÓN, RESPUESTA y PLANIFICACIÓN.",
  },
  SOAP: {
    pt: "Estruture em: SUBJETIVO, OBJETIVO, AVALIAÇÃO e PLANO.",
    en: "Structure in: SUBJECTIVE, OBJECTIVE, ASSESSMENT, and PLAN.",
    es: "Estructure en: SUBJETIVO, OBJETIVO, EVALUACIÓN y PLAN.",
  },
  FREE: {
    pt: "Produza uma evolução clínica narrativa organizada em parágrafos.",
    en: "Produce an organized narrative clinical evolution.",
    es: "Produzca una evolución clínica narrativa organizada.",
  },
};

function buildSystemPrompt(lang: Lang, format: SessionFormat): string {
  return `You are a clinical documentation assistant for licensed psychologists on Doctor8 (Brazil/EHR).

Generate a DRAFT session note — the psychologist MUST review and sign. You are not the author of record.

Format: ${format}
${FORMAT_GUIDE[format][lang]}

RULES:
- Write entirely in ${LANG_LABEL[lang]}.
- Use professional, ethical language aligned with CFP standards.
- Do not invent facts not present in the input.
- If information is missing, use "—" or note it was not documented.
- Return ONLY valid JSON: { "fields": { "fieldKey": "text", ... } } using the exact field keys provided.
- No markdown, no preamble.`;
}

export async function generatePsychologyNoteDraft(params: {
  lang: Lang;
  format: SessionFormat;
  fieldKeys: string[];
  rawNotes: string;
  patientName?: string | null;
  durationMins?: number;
}): Promise<Record<string, string>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("AI_NOT_CONFIGURED");

  const trimmed = params.rawNotes.trim();
  if (!trimmed) throw new Error("NO_CONTENT");

  const keysList = params.fieldKeys.map((k) => `"${k}"`).join(", ");

  const userText = [
    "Patient: Paciente",
    params.durationMins ? `Session duration: ${params.durationMins} min` : "",
    `Required JSON field keys: ${keysList}`,
    "",
    "Psychologist's raw notes / dictation / session summary:",
    trimmed,
  ].filter(Boolean).join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1800,
      system: buildSystemPrompt(params.lang, params.format),
      messages: [{ role: "user", content: userText }],
    }),
  });

  if (!response.ok) {
    console.error("[AI-PSY-NOTES]", await response.text());
    throw new Error("AI_REQUEST_FAILED");
  }

  const data = await response.json();
  const text = data.content?.find((b: { type: string }) => b.type === "text")?.text?.trim();
  if (!text) throw new Error("AI_EMPTY_RESPONSE");

  try {
    const parsed = JSON.parse(text) as { fields?: Record<string, string> };
    if (!parsed.fields || typeof parsed.fields !== "object") throw new Error("bad shape");
    const out: Record<string, string> = {};
    for (const key of params.fieldKeys) {
      out[key] = String(parsed.fields[key] ?? "").trim();
    }
    return out;
  } catch {
    // Fallback: put entire response in first field
    const out: Record<string, string> = {};
    params.fieldKeys.forEach((k, i) => {
      out[k] = i === 0 ? text : "";
    });
    return out;
  }
}
