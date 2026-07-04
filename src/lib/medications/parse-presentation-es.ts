// Pure helpers to derive pharmaceutical form and dosage from INHRR (Venezuela) product strings.
// Form labels are returned in Portuguese for consistency with the BR catalog UI.

type FormPattern = { pattern: RegExp; form: string };

const FORM_PATTERNS: FormPattern[] = [
  { pattern: /\bCOMPRIMIDOS?\s+RECUBIERTOS?\b/i, form: "Comprimido" },
  { pattern: /\bCOMPRIMIDOS?\b/i, form: "Comprimido" },
  { pattern: /\bTABLETAS?\s+RECUBIERTAS?\b/i, form: "Comprimido" },
  { pattern: /\bTABLETAS?\b/i, form: "Comprimido" },
  { pattern: /\bGRAGEAS?\b/i, form: "Drágea" },
  { pattern: /\bCAPSULAS?\s+BLANDAS?\b/i, form: "Cápsula" },
  { pattern: /\bCAPSULAS?\b/i, form: "Cápsula" },
  { pattern: /\bJARABE\b/i, form: "Xarope (frasco)" },
  { pattern: /\bSUSPENSION\s+ORAL\b/i, form: "Suspensão oral (frasco)" },
  { pattern: /\bSUSPENSION\s+INYECTABLE\b/i, form: "Injetável" },
  { pattern: /\bSUSPENSION\b/i, form: "Suspensão oral (frasco)" },
  { pattern: /\bSOLUCION\s+ORAL\b/i, form: "Solução oral (frasco)" },
  { pattern: /\bSOLUCION\s+INYECTABLE\b/i, form: "Injetável" },
  { pattern: /\bSOLUCION\s+PARA\s+INFUSION\b/i, form: "Injetável" },
  { pattern: /\bAMPOLLAS?\b/i, form: "Injetável" },
  { pattern: /\bGOTAS\b/i, form: "Gotas (frasco)" },
  { pattern: /\bCREMA\b/i, form: "Creme" },
  { pattern: /\bUNGUENTO\b/i, form: "Pomada" },
  { pattern: /\bPOMADA\b/i, form: "Pomada" },
  { pattern: /\bGEL\b/i, form: "Gel" },
  { pattern: /\bOVULOS?\b/i, form: "Óvulo" },
  { pattern: /\bSUPOSITORIOS?\b/i, form: "Supositório" },
  { pattern: /\bPOLVO\s+PARA\s+SUSPENSION\b/i, form: "Pó" },
  { pattern: /\bPOLVO\b/i, form: "Pó" },
  { pattern: /\bSOBRES?\b/i, form: "Sachê" },
  { pattern: /\bAEROSOL\b/i, form: "Aerossol / Spray" },
  { pattern: /\bSPRAY\b/i, form: "Aerossol / Spray" },
  { pattern: /\bINHALADOR\b/i, form: "Aerossol / Spray" },
  { pattern: /\bPARCHES?\b/i, form: "Adesivo" },
  { pattern: /\bCOLIRIO\b/i, form: "Colírio (frasco)" },
  { pattern: /\bSOLUCION\s+OFTALMICA\b/i, form: "Colírio (frasco)" },
  { pattern: /\bLOCION\b/i, form: "Loção" },
];

type FormMatch = { index: number; length: number; form: string };

export type StripBrandMethod = "dosage" | "form" | "unchanged";

export type StripBrandResult = {
  presentation: string;
  method: StripBrandMethod;
};

const DOSAGE_RE =
  /\d+(?:[.,]\d+)?\s*(?:%|U\.I\.|UI|IU|mg\/mL|mg\/ml|mg\/\d+\s*mL|mg|g|mcg|\u03bcg|ug|ml|mL)(?:\s*\/\s*\d+(?:[.,]\d+)?\s*(?:ml|mL|mg|g|L))?(?:\s*[-+]\s*\d+(?:[.,]\d+)?\s*(?:%|U\.I\.|UI|IU|mg\/mL|mg\/ml|mg\/\d+\s*mL|mg|g|mcg|\u03bcg|ug|ml|mL))*/gi;

function normalizeForMatch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function normalizedCharLength(char: string): number {
  return char
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .length;
}

function normIndexToOriginal(text: string, normIndex: number): number {
  let ni = 0;
  for (let oi = 0; oi < text.length; oi++) {
    if (ni >= normIndex) return oi;
    ni += normalizedCharLength(text[oi]);
  }
  return text.length;
}

function findFormMatchEs(text: string): FormMatch | null {
  const normalized = normalizeForMatch(text);
  let best: FormMatch | null = null;

  for (const { pattern, form } of FORM_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    const match = re.exec(normalized);
    if (!match || match.index === undefined) continue;

    const candidate: FormMatch = {
      index: match.index,
      length: match[0].length,
      form,
    };

    if (
      !best
      || candidate.index < best.index
      || (candidate.index === best.index && candidate.length > best.length)
    ) {
      best = candidate;
    }
  }

  return best;
}

function findFirstDosageIndex(text: string): number | null {
  const re = new RegExp(DOSAGE_RE.source, DOSAGE_RE.flags);
  const match = re.exec(text);
  if (!match || match.index === undefined) return null;
  if (!/\d/.test(match[0])) return null;
  return match.index;
}

export function stripBrandFromPresentationEsDetailed(text: string): StripBrandResult {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    return { presentation: trimmed, method: "unchanged" };
  }

  const dosageIndex = findFirstDosageIndex(trimmed);
  if (dosageIndex !== null) {
    return {
      presentation: trimmed.slice(dosageIndex).trim(),
      method: "dosage",
    };
  }

  const formMatch = findFormMatchEs(trimmed);
  if (formMatch) {
    const start = normIndexToOriginal(trimmed, formMatch.index);
    return {
      presentation: trimmed.slice(start).trim(),
      method: "form",
    };
  }

  return { presentation: trimmed, method: "unchanged" };
}

export function stripBrandFromPresentationEs(text: string): string {
  return stripBrandFromPresentationEsDetailed(text).presentation;
}

export function extractPharmaceuticalFormEs(text: string): string {
  return findFormMatchEs(text)?.form ?? "Outro";
}

export function extractDosageEs(text: string): string | null {
  const formMatch = findFormMatchEs(text);
  const cutAt = formMatch
    ? normIndexToOriginal(text, formMatch.index)
    : text.length;
  const searchText = text.slice(0, cutAt);

  const re = new RegExp(DOSAGE_RE.source, DOSAGE_RE.flags);
  let last: string | null = null;
  let match: RegExpExecArray | null;
  while ((match = re.exec(searchText)) !== null) {
    last = match[0].trim().replace(/\s+/g, " ");
  }

  if (!last || !/\d/.test(last)) return null;
  return last;
}
