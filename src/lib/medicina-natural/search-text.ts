/** Limite seguro para índice btree do PostgreSQL (~2704 bytes por linha). */
export const MEDICINA_NATURAL_SEARCH_TEXT_MAX = 480;

export function normalizeSearchText(parts: (string | null | undefined)[]): string {
  return parts
    .filter((p): p is string => Boolean(p?.trim()))
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Remove entradas inválidas (parser PDF) antes de indexar busca. */
export function sanitizeNomeAlternativo(value: string): string | null {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text || text.length > 80) return null;
  if (/-- \d+ of/i.test(text)) return null;
  if (/formul[aá]rio de fitoter[aá]picos/i.test(text)) return null;
  if (/^(prepara|tintura|orienta|embalagem|advert|modo|refer|f[oó]rmula|componentes)/i.test(text)) {
    return null;
  }
  return text;
}

export function buildMedicinaNaturalSearchText(
  parts: (string | null | undefined)[],
  alternativos: string[] = [],
): string {
  const alt = alternativos
    .map(sanitizeNomeAlternativo)
    .filter((x): x is string => Boolean(x))
    .slice(0, 8);
  const text = normalizeSearchText([...parts, ...alt]);
  return text.length > MEDICINA_NATURAL_SEARCH_TEXT_MAX
    ? text.slice(0, MEDICINA_NATURAL_SEARCH_TEXT_MAX)
    : text;
}

export function slugFromNomeCientifico(nomeCientifico: string): string {
  return normalizeSearchText([nomeCientifico]).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
