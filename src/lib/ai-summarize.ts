// Clinical AI summary helper — Anthropic Claude for doctor-facing document aids.

import { Lang } from "@/lib/i18n/translations";

const LANG_LABEL: Record<Lang, string> = {
  pt: "Portuguese (Brazil)",
  en: "English",
  es: "Spanish",
};

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

function buildSystemPrompt(lang: Lang): string {
  return `You are a clinical documentation assistant for licensed healthcare professionals using Doctor8.

Your job is to produce a concise, structured summary of medical or health-related material so the doctor can review it faster.

Format your response with these sections (use markdown headings):
## Visão geral / Overview
## Pontos principais / Key points
## Relevância clínica / Clinical relevance
## Itens para revisar / Suggested review

Rules:
- Write the entire response in ${LANG_LABEL[lang]}.
- Be factual; only use information present in the material.
- Do NOT provide definitive diagnoses, prescriptions, or treatment plans.
- If content is sparse, say what is available and what is missing.
- Keep the summary practical (roughly 150–350 words unless the source is very rich).
- This is a clinical aid only — the physician retains full responsibility.`;
}

export async function generateClinicalSummary(params: {
  lang: Lang;
  title: string;
  content?: string | null;
  category?: string | null;
  url?: string | null;
  patientName?: string | null;
  hasFile?: boolean;
  file?: { body: Buffer; contentType?: string; fileName?: string } | null;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("AI_NOT_CONFIGURED");

  const parts: string[] = [
    `Title: ${params.title}`,
    params.category ? `Category: ${params.category}` : "",
    params.patientName ? `Patient: ${params.patientName}` : "",
    params.url ? `Link: ${params.url}` : "",
    params.content ? `Description / notes:\n${params.content}` : "",
    params.hasFile && !params.file ? "Note: an attachment exists but could not be read automatically. Summarize based on the metadata above." : "",
  ].filter(Boolean);

  const userContent: ContentBlock[] = [{ type: "text", text: parts.join("\n\n") }];

  if (params.file) {
    const ct = (params.file.contentType || "").toLowerCase();
    const name = (params.file.fileName || "").toLowerCase();
    const isPdf = ct.includes("pdf") || name.endsWith(".pdf");
    const isImage = ct.startsWith("image/") || /\.(jpe?g|png|webp|heic)$/i.test(name);

    if (isPdf && params.file.body.length <= 8 * 1024 * 1024) {
      userContent.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: params.file.body.toString("base64"),
        },
      });
    } else if (isImage && params.file.body.length <= 5 * 1024 * 1024) {
      const mediaType = ct.startsWith("image/") ? ct : "image/jpeg";
      userContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: params.file.body.toString("base64"),
        },
      });
    } else {
      const first = userContent[0];
      if (first.type === "text") {
        first.text += "\n\nNote: attachment present but not processed (unsupported type or too large).";
      }
    }
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 900,
      system: buildSystemPrompt(params.lang),
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!response.ok) {
    console.error("[AI-SUMMARIZE]", await response.text());
    throw new Error("AI_REQUEST_FAILED");
  }

  const data = await response.json();
  const text = data.content?.find((b: { type: string }) => b.type === "text")?.text;
  if (!text) throw new Error("AI_EMPTY_RESPONSE");
  return text.trim();
}
