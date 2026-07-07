// RAG-style chart Q&A for psychologists (reads decrypted chart summaries).

import type { Lang } from "@/lib/i18n/translations";
import { LANG_LABEL } from "@/lib/ai-clinical-standards";
import { decrypt } from "@/lib/encryption";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export function buildChartContext(docs: {
  title: string;
  content: string | null;
  createdAt: Date;
  type: string;
}[]): string {
  const parts: string[] = [];
  for (const d of docs) {
    const title = safeDecrypt(d.title);
    const raw = safeDecrypt(d.content);
    let body = raw;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.renderedBody) body = String(parsed.renderedBody);
      else if (parsed?.psychologyNote) body = JSON.stringify(parsed.fields || parsed);
    } catch { /* plain text */ }
    if (!body.trim()) continue;
    parts.push(
      `[${d.createdAt.toISOString().slice(0, 10)}] ${title} (${d.type})\n${body.slice(0, 2000)}`,
    );
  }
  return parts.join("\n\n---\n\n").slice(0, 24000);
}

export async function answerChartQuestion(params: {
  lang: Lang;
  patientName: string;
  chartContext: string;
  question: string;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("AI_NOT_CONFIGURED");

  const q = params.question.trim();
  if (!q) throw new Error("NO_QUESTION");
  if (!params.chartContext.trim()) throw new Error("NO_CHART_DATA");

  const system = `You are a clinical documentation assistant for a licensed psychologist on Doctor8.

Answer questions about the patient chart using ONLY the provided chart excerpts.
Write in ${LANG_LABEL[params.lang]}.
If the chart does not contain enough information, say so clearly.
Never invent clinical facts. Remind that clinical decisions are the psychologist's responsibility.
Be concise and structured with bullet points when helpful.`;

  const userText = `Patient: ${params.patientName}

Chart excerpts:
${params.chartContext}

Question: ${q}`;

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
      system,
      messages: [{ role: "user", content: userText }],
    }),
  });

  if (!response.ok) {
    console.error("[AI-CHART-CHAT]", await response.text());
    throw new Error("AI_REQUEST_FAILED");
  }

  const data = await response.json();
  const text = data.content?.find((b: { type: string }) => b.type === "text")?.text;
  if (!text) throw new Error("AI_EMPTY_RESPONSE");
  return text.trim();
}
