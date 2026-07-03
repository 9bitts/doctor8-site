// AI-assisted symptom ? specialty matching (Anthropic Claude Haiku).

import type { Lang } from "@/lib/i18n/translations";
import { buildSpecialtyCatalogForAi } from "@/lib/public-search-catalog";

export type AiSymptomMatch = {
  specialtySlug: string;
  confidence: number;
  reason: string;
};

const LANG_NAME: Record<Lang, string> = {
  pt: "Portuguese",
  en: "English",
  es: "Spanish",
};

export async function matchSymptomWithAi(
  query: string,
  lang: Lang,
): Promise<AiSymptomMatch[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];

  const catalog = await buildSpecialtyCatalogForAi(lang);
  if (catalog.length === 0) return [];

  const catalogText = catalog
    .slice(0, 80)
    .map((c) => `- ${c.slug}: ${c.label} (${c.keywords.slice(0, 4).join(", ")})`)
    .join("\n");

  const system = `You help patients find the right healthcare specialty on Doctor8 (Brazil).
You are NOT diagnosing. You suggest which specialty(ies) may help based on the patient's description.

Rules:
- Return ONLY valid JSON array, no markdown.
- Use specialty slugs exactly from the catalog.
- For mental health symptoms (anxiety, depression, grief, trauma), include ALL relevant types when applicable: psicologo, psicanalista, psiquiatra.
- For integrative / complementary needs (acupuncture, yoga, reiki, homeopathy), use terapeuta-integrativo or specific PICS slugs.
- Include 1-5 options, sorted by relevance.
- confidence is 0.0-1.0.

Catalog:
${catalogText}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system,
      messages: [
        {
          role: "user",
          content: `Patient query (${LANG_NAME[lang]}): "${query}"

Respond with JSON array: [{"specialtySlug":"...","confidence":0.9,"reason":"short reason in ${LANG_NAME[lang]}"}]`,
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error("[SYMPTOM-AI]", await response.text());
    return [];
  }

  const data = await response.json();
  const text = data.content?.find((b: { type: string }) => b.type === "text")?.text?.trim();
  if (!text) return [];

  try {
    const cleaned = text.replace(/^```json?\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(cleaned) as AiSymptomMatch[];
    if (!Array.isArray(parsed)) return [];

    const validSlugs = new Set(catalog.map((c) => c.slug));
    return parsed
      .filter(
        (m) =>
          m &&
          typeof m.specialtySlug === "string" &&
          validSlugs.has(m.specialtySlug) &&
          typeof m.confidence === "number",
      )
      .map((m) => ({
        specialtySlug: m.specialtySlug,
        confidence: Math.max(0, Math.min(1, m.confidence)),
        reason: typeof m.reason === "string" ? m.reason.slice(0, 200) : "",
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  } catch {
    console.error("[SYMPTOM-AI] parse failed:", text.slice(0, 200));
    return [];
  }
}
