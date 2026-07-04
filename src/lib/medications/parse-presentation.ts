// Pure helpers to derive pharmaceutical form and dosage from CMED APRESENTAÇÃO strings.

type FormPattern = { regex: RegExp; form: string };

const FORM_PATTERNS: FormPattern[] = [
  { regex: /\bCOM\s+REV\b/i, form: "Comprimido" },
  { regex: /\bCREM\s+DERM\b/i, form: "Creme" },
  { regex: /\bSOL\s+INJ\b/i, form: "Injetável" },
  { regex: /\bSUS\s+INJ\b/i, form: "Injetável" },
  { regex: /\bSOL\s+OR\b/i, form: "Solução oral (frasco)" },
  { regex: /\bSUS\s+OR\b/i, form: "Suspensão oral (frasco)" },
  { regex: /\bSOL\s+GTS\b/i, form: "Gotas (frasco)" },
  { regex: /\bCOM\b/i, form: "Comprimido" },
  { regex: /\bCAP\b/i, form: "Cápsula" },
  { regex: /\bXP\b/i, form: "Xarope (frasco)" },
  { regex: /\bCREM\b/i, form: "Creme" },
  { regex: /\bPOM\b/i, form: "Pomada" },
  { regex: /\bGEL\b/i, form: "Gel" },
  { regex: /\bSACHE\b/i, form: "Sachê" },
  { regex: /\bPO\b/i, form: "Pó" },
  { regex: /\bGTS\b/i, form: "Gotas (frasco)" },
  { regex: /\bAER\b/i, form: "Aerossol / Spray" },
  { regex: /\bSPR\b/i, form: "Aerossol / Spray" },
  { regex: /\bSUP\b/i, form: "Supositório" },
  { regex: /\bADES\b/i, form: "Adesivo" },
  { regex: /\bCOL\b/i, form: "Colírio (frasco)" },
  { regex: /\bENV\b/i, form: "Envelope" },
];

type FormMatch = { index: number; length: number; form: string };

function findFormMatch(presentation: string): FormMatch | null {
  const text = presentation || "";
  let best: FormMatch | null = null;

  for (const { regex, form } of FORM_PATTERNS) {
    const re = new RegExp(regex.source, regex.flags);
    const match = re.exec(text);
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

export function extractPharmaceuticalForm(presentation: string): string {
  return findFormMatch(presentation)?.form ?? "Outro";
}

export function extractDosage(presentation: string): string | null {
  const match = findFormMatch(presentation);
  if (!match || match.index <= 0) return null;

  const raw = presentation.slice(0, match.index).trim().replace(/\s+/g, " ");
  if (!raw) return null;

  // Require at least one digit to avoid returning packaging noise only.
  if (!/\d/.test(raw)) return null;

  return raw;
}

export function normalizeSearchPresentation(presentation: string): string {
  return presentation
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
