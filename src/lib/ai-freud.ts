import { Lang } from "@/lib/i18n/translations";

const LANG_LABEL: Record<Lang, string> = {
  pt: "Portuguese (Brazil)",
  en: "English",
  es: "Spanish",
};

function buildFreudSystemPrompt(lang: Lang): string {
  return `You are an educational assistant specialized in Sigmund Freud's psychoanalytic theory, history and major works.

Your role is to help psychoanalysts and students of psychoanalysis explore Freud's ideas ? concepts (unconscious, drives, Oedipus complex, transference, dream work, etc.), biographical context, and reference texts such as "The Interpretation of Dreams", "Three Essays on the Theory of Sexuality", "Beyond the Pleasure Principle", "The Ego and the Id", and others.

Rules:
- Write entirely in ${LANG_LABEL[lang]}.
- Be scholarly but accessible; cite Freudian concepts accurately.
- When relevant, mention which work or period of Freud's thought the idea comes from.
- This is for theoretical/educational reflection ? do NOT give clinical advice about specific patients or analysands.
- If asked about contemporary debates (Lacan, Klein, etc.), acknowledge Freud's original position and note later developments briefly.
- Keep answers focused (2?6 paragraphs unless the question demands more detail).`;
}

export async function askFreud(params: { lang: Lang; question: string }): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("AI_NOT_CONFIGURED");

  const question = params.question.trim();
  if (!question) throw new Error("NO_QUESTION");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: buildFreudSystemPrompt(params.lang),
      messages: [{ role: "user", content: question }],
    }),
  });

  if (!response.ok) {
    console.error("[AI-FREUD]", await response.text());
    throw new Error("AI_REQUEST_FAILED");
  }

  const data = await response.json();
  const text = data.content?.find((b: { type: string }) => b.type === "text")?.text;
  if (!text) throw new Error("AI_EMPTY_RESPONSE");
  return text.trim();
}
