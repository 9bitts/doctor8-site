// Clinical AI summary helper — Anthropic Claude for doctor-facing document aids.

import { Lang } from "@/lib/i18n/translations";
import {
  clinicalSummaryExcellenceGuide,
  LANG_LABEL,
  summarySectionHeadings,
} from "@/lib/ai-clinical-standards";

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

function buildSystemPrompt(lang: Lang): string {
  const sections = summarySectionHeadings(lang);

  return `You are a clinical document intelligence assistant for licensed healthcare professionals using Doctor8.

You help clinicians review labs, imaging reports, referral letters, and shared resources faster — like a pre-visit chart prep tool. You do not replace clinical judgment.

Format your response with EXACTLY these markdown sections (keep headings verbatim):

${sections}

${clinicalSummaryExcellenceGuide(lang)}`;
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
    params.hasFile && !params.file
      ? "Note: an attachment exists but could not be read automatically. Summarize based on the metadata above and list what could not be verified."
      : "",
  ].filter(Boolean);

  const userContent: ContentBlock[] = [
    {
      type: "text",
      text: [
        parts.join("\n\n"),
        "",
        `Analyze the material and produce the structured summary in ${LANG_LABEL[params.lang]}.`,
      ].join("\n"),
    },
  ];

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
        first.text += "\n\nNote: attachment present but not processed (unsupported type or too large). State this in Suggested review.";
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
      max_tokens: 1100,
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
