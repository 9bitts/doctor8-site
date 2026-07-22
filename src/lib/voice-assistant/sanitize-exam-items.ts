/** Filter STT/AI noise so demographic phrases never become exam lines. */

const DEMOGRAPHIC_RE =
  /^(mulher|homem|paciente|obesa?|obeso|idos[ao]|menina|menino|criança|gestante|sra?\.?|dr[a]?\.?)\b/i;
const REQUEST_ONLY_RE =
  /^(requisi[cç][aã]o|pedido)\s+(de\s+)?exames?(\s+laboratoriais?)?$/i;
const NOISE_RE =
  /^(laboratoriais?|de\s+imagem|exames?|laboratório|laboratorio)$/i;

export function sanitizeExamItems(items: string[] | null | undefined): string[] {
  if (!items?.length) return [];
  const out: string[] = [];
  for (const raw of items) {
    const s = raw.replace(/\s+/g, " ").trim();
    if (s.length < 3) continue;
    if (DEMOGRAPHIC_RE.test(s)) continue;
    if (REQUEST_ONLY_RE.test(s)) continue;
    if (NOISE_RE.test(s)) continue;
    // Reject blobs that are only "exams + demographics + name"
    if (
      /exames?\s+laboratoriais?/i.test(s) &&
      (DEMOGRAPHIC_RE.test(s) || /\b(obesa?|obeso|mulher|homem)\b/i.test(s))
    ) {
      continue;
    }
    out.push(s);
  }
  return out;
}
