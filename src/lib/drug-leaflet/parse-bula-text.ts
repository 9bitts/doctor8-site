import type { DrugLeafletSection, DrugLeafletSectionKey } from "./types";
import { leafletSectionTitle } from "./section-titles";

/** Maps common ANVISA bula heading patterns to internal section keys. */
const HEADING_PATTERNS: { key: DrugLeafletSectionKey; patterns: RegExp[] }[] = [
  { key: "identificacao", patterns: [/identifica/i] },
  { key: "contraindicacoes", patterns: [/contraindic/i] },
  { key: "indicacoes", patterns: [/^indica/i, /\bindica[cç][oõ]es/i] },
  { key: "precaucoes", patterns: [/advert[eê]ncias/i, /precau[cç]/i] },
  { key: "interacoes", patterns: [/intera[cç][oõ]es/i] },
  { key: "reacoes_adversas", patterns: [/rea[cç][oõ]es\s+adversas/i, /rea[cç].*adversas/i] },
  { key: "posologia", patterns: [/posologia/i, /modo\s+de\s+usar/i] },
  { key: "superdose", patterns: [/superdose/i] },
  { key: "farmacologia", patterns: [/farmacodin[aâ]mica/i, /farmacocin[eé]tica/i, /farmacologia/i] },
  { key: "gestacao_pediatria", patterns: [/gesta[cç]/i, /lacta[cç]/i, /pediatria/i, /gravidez/i] },
];

function matchSectionKey(heading: string): DrugLeafletSectionKey | null {
  const h = heading.trim();
  for (const { key, patterns } of HEADING_PATTERNS) {
    if (patterns.some((p) => p.test(h))) return key;
  }
  return null;
}

/**
 * Splits raw bula profissional text (PDF extraction) into accordion sections.
 * Headings may be numbered ("7. POSOLOGIA") or uppercase lines.
 */
export function parseBulaTextToSections(raw: string): DrugLeafletSection[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const sections: DrugLeafletSection[] = [];
  let currentKey: DrugLeafletSectionKey | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (!currentKey) return;
    const content = buffer.join("\n").trim();
    if (!content) return;
    const existing = sections.find((s) => s.key === currentKey);
    if (existing) {
      existing.content = `${existing.content}\n\n${content}`;
    } else {
      sections.push({
        key: currentKey,
        title: leafletSectionTitle(currentKey),
        content,
        defaultOpen: currentKey === "posologia",
      });
    }
    buffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentKey) buffer.push("");
      continue;
    }

    const numbered = trimmed.match(/^\d+\.?\s+(.+)$/);
    const candidate = numbered ? numbered[1] : trimmed;
    const isHeading =
      numbered !== null ||
      (trimmed.length < 80 && trimmed === trimmed.toUpperCase() && /[A-ZÁÉÍÓÚÃÕÇ]/.test(trimmed));

    if (isHeading) {
      const key = matchSectionKey(candidate);
      if (key) {
        flush();
        currentKey = key;
        continue;
      }
    }

    if (currentKey) buffer.push(trimmed);
  }
  flush();

  return sections;
}

export function extractPosologyExcerpt(sections: DrugLeafletSection[], maxLen = 500): string | undefined {
  const pos = sections.find((s) => s.key === "posologia");
  if (!pos?.content.trim()) return undefined;
  return pos.content.trim().slice(0, maxLen);
}
