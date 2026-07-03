// Unified symptom search: static rules + DB + optional AI.

import type { Lang } from "@/lib/i18n/translations";
import { seoSlugToSpecialtyLabel } from "@/lib/public-slugs";
import {
  normalizeSearchText,
  searchSymptomsInProviderData,
} from "@/lib/public-search-catalog";
import { matchSymptomWithAi } from "@/lib/symptom-search-ai";
import { matchSymptomQuery } from "@/lib/symptom-search";

const MENTAL_HEALTH_SLUGS = ["psicologo", "psicanalista", "psiquiatra"] as const;

/** ASCII-only; normalizeSearchText strips accents on both query and keywords. */
const MENTAL_KEYWORDS = [
  "ansiedade",
  "anxiety",
  "ansiedad",
  "depressao",
  "depression",
  "depresion",
  "panico",
  "panic",
  "estresse",
  "stress",
  "estres",
  "luto",
  "grief",
  "duelo",
  "trauma",
  "autoestima",
  "self-esteem",
  "terapia",
  "therapy",
  "psicoterapia",
  "psychotherapy",
];

function mentalHealthReason(lang: Lang): string {
  if (lang === "en") return "May help with emotional wellbeing";
  if (lang === "es") return "Puede ayudar con el bienestar emocional";
  return "Pode ajudar com bem-estar emocional";
}

function suggestsMentalHealth(query: string): boolean {
  const q = normalizeSearchText(query);
  return MENTAL_KEYWORDS.some((kw) => q.includes(normalizeSearchText(kw)));
}

export type SymptomSearchMatch = {
  specialtySlug: string;
  label: string;
  score: number;
  source: "static" | "database" | "ai";
  reason?: string;
};

function mergeMatches(items: SymptomSearchMatch[]): SymptomSearchMatch[] {
  const map = new Map<string, SymptomSearchMatch>();
  for (const item of items) {
    const cur = map.get(item.specialtySlug);
    if (!cur || item.score > cur.score) {
      map.set(item.specialtySlug, item);
    } else if (cur && item.reason && !cur.reason) {
      map.set(item.specialtySlug, { ...cur, reason: item.reason });
    }
  }
  return [...map.values()].sort((a, b) => b.score - a.score);
}

export async function searchSymptomsUnified(
  query: string,
  lang: Lang,
  opts: { useAi?: boolean } = {},
): Promise<{ matches: SymptomSearchMatch[]; aiUsed: boolean }> {
  const q = query.trim();
  if (q.length < 2) return { matches: [], aiUsed: false };

  const collected: SymptomSearchMatch[] = [];

  const staticHit = matchSymptomQuery(q, lang);
  if (staticHit) {
    collected.push({
      specialtySlug: staticHit.specialtySlug,
      label: seoSlugToSpecialtyLabel(staticHit.specialtySlug, lang),
      score: 55 + staticHit.score,
      source: "static",
      reason: staticHit.matchedKeyword,
    });
  }

  const dbHits = await searchSymptomsInProviderData(q, lang);
  for (const hit of dbHits) {
    collected.push({
      specialtySlug: hit.specialtySlug,
      label: hit.label,
      score: hit.score,
      source: "database",
      reason: hit.matchedText,
    });
  }

  if (suggestsMentalHealth(q)) {
    const reason = mentalHealthReason(lang);
    for (const slug of MENTAL_HEALTH_SLUGS) {
      collected.push({
        specialtySlug: slug,
        label: seoSlugToSpecialtyLabel(slug, lang),
        score: 72,
        source: "static",
        reason,
      });
    }
  }

  let aiUsed = false;
  if (opts.useAi !== false) {
    const aiHits = await matchSymptomWithAi(q, lang);
    if (aiHits.length > 0) aiUsed = true;
    for (const hit of aiHits) {
      collected.push({
        specialtySlug: hit.specialtySlug,
        label: seoSlugToSpecialtyLabel(hit.specialtySlug, lang),
        score: Math.round(hit.confidence * 100),
        source: "ai",
        reason: hit.reason,
      });
    }
  }

  const matches = mergeMatches(collected).filter((m) => m.score >= 30).slice(0, 6);
  return { matches, aiUsed };
}
