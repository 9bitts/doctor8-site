import { Lang } from "@/lib/i18n/translations";
import { freudEducationalExcellenceGuide, LANG_LABEL } from "@/lib/ai-clinical-standards";

function buildFreudSystemPrompt(lang: Lang): string {
  return `You are an educational assistant specialized in Sigmund Freud's psychoanalytic theory, biography, and major works — built for psychoanalysts and advanced students using Doctor8.

You help explore Freudian concepts (unconscious, drives/Trieb, Oedipus complex, transference, dream work, repression, symptom formation, etc.), historical context, and canonical texts.

${freudEducationalExcellenceGuide(lang)}`;
}

export async function askFreud(params: { lang: Lang; question: string }): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("AI_NOT_CONFIGURED");

  const question = params.question.trim();
  if (!question) throw new Error("NO_QUESTION");

  const userContent = [
    `Question (${LANG_LABEL[params.lang]}):`,
    question,
    "",
    "Provide a rigorous, educational answer following the structure guidelines when helpful.",
  ].join("\n");

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
      system: buildFreudSystemPrompt(params.lang),
      messages: [{ role: "user", content: userContent }],
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
