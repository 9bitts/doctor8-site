// Clinical literature search — query structuring and ranked summarization via Anthropic Claude.

import { Lang } from "@/lib/i18n/translations";
import { LANG_LABEL } from "@/lib/ai-clinical-standards";
import type { PubMedArticleSummary } from "@/lib/pubmed";

const MODEL = "claude-haiku-4-5-20251001";

const REGULATORY_GUARDRAILS = `
REGULATORY GUARDRAILS (mandatory):
- This is a DECISION SUPPORT tool for licensed healthcare professionals. It is NOT prescriptive and does NOT determine medical conduct.
- NEVER recommend a specific therapy, dose, or treatment plan for a specific patient.
- Summarize what the published literature reports; the clinician decides applicability.
- Strip or ignore any patient identifiers if present in the input.
- Every factual claim MUST cite a PMID from the provided articles.
- If evidence is insufficient or conflicting, say so explicitly.
`.trim();

function buildQuerySystemPrompt(lang: Lang): string {
  return `You convert anonymous clinical scenario descriptions into PubMed search queries for licensed healthcare professionals using Doctor8.

${REGULATORY_GUARDRAILS}

Output ONLY valid JSON (no markdown fences) with this shape:
{"query":"<concise PubMed query, MeSH-friendly when possible>","keywords":["term1","term2",...]}

Rules for the query:
- 3–6 keywords in the keywords array
- Focus on conditions, interventions, outcomes — not patient identifiers
- Use English for PubMed terms even when the scenario is in ${LANG_LABEL[lang]}
- Keep query under ~120 characters when possible`;
}

function buildRankSystemPrompt(lang: Lang): string {
  return `You rank and summarize PubMed articles for a licensed healthcare professional using Doctor8 literature search.

${REGULATORY_GUARDRAILS}

Write entirely in ${LANG_LABEL[lang]}.

Format your response as markdown with EXACTLY two top-level sections using headings in ${LANG_LABEL[lang]}:
1. An executive summary section (## heading)
2. A ranked articles section (## heading)

Executive summary: 2–4 short paragraphs synthesizing what the literature suggests. Cite PMIDs inline like (PMID: 12345678). Do NOT prescribe for a specific patient.

Ranked articles: for each article (most relevant first, up to 10), use ### subheading with rank and title, then author/journal/year line with PMID, then 1–2 relevance sentences. No treatment directives for an individual patient.`;
}

async function callClaude(system: string, user: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("AI_NOT_CONFIGURED");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!response.ok) {
    console.error("[AI-LITERATURE-SEARCH]", await response.text());
    throw new Error("AI_REQUEST_FAILED");
  }

  const data = await response.json();
  const text = data.content?.find((b: { type: string }) => b.type === "text")?.text;
  if (!text) throw new Error("AI_EMPTY_RESPONSE");
  return text.trim();
}

function parseQueryJson(raw: string): { query: string; keywords: string[] } {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const parsed = JSON.parse(cleaned) as { query?: string; keywords?: unknown };
  const query = typeof parsed.query === "string" ? parsed.query.trim() : "";
  const keywords = Array.isArray(parsed.keywords)
    ? parsed.keywords.filter((k): k is string => typeof k === "string" && k.trim().length > 0).slice(0, 6)
    : [];
  if (!query) throw new Error("AI_EMPTY_RESPONSE");
  return { query, keywords };
}

export async function buildQueryFromCase(
  caseText: string,
  lang: Lang,
): Promise<{ query: string; keywords: string[] }> {
  const user = [
    "Clinical scenario (anonymous):",
    caseText.trim(),
    "",
    `Return the JSON query object. Scenario language context: ${LANG_LABEL[lang]}.`,
  ].join("\n");

  const raw = await callClaude(buildQuerySystemPrompt(lang), user, 400);
  return parseQueryJson(raw);
}

function formatArticlesForPrompt(articles: PubMedArticleSummary[]): string {
  return articles
    .map((a) => {
      const authors = a.authors.slice(0, 5).join(", ");
      const suffix = a.authors.length > 5 ? " et al." : "";
      const abstract = a.abstract
        ? a.abstract.slice(0, 1200) + (a.abstract.length > 1200 ? "…" : "")
        : "(abstract unavailable)";
      return [
        `PMID: ${a.pmid}`,
        `Title: ${a.title}`,
        `Authors: ${authors}${suffix}`,
        `Journal: ${a.journal} (${a.year})`,
        `Abstract: ${abstract}`,
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

export async function rankAndSummarize(params: {
  caseText: string;
  articles: PubMedArticleSummary[];
  lang: Lang;
}): Promise<string> {
  if (params.articles.length === 0) {
    return "## Executive summary\n\nNo PubMed articles were retrieved for this query. Consider broadening the clinical description or refining search terms.\n\n## Ranked articles\n\n(none)";
  }

  const user = [
    "Clinical question (anonymous):",
    params.caseText.trim(),
    "",
    "Retrieved PubMed articles:",
    formatArticlesForPrompt(params.articles),
    "",
    "Rank by relevance and produce the markdown summary.",
  ].join("\n");

  return callClaude(buildRankSystemPrompt(params.lang), user, 1500);
}
