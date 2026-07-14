/** Deep link to ANVISA Bulário Eletrônico search by product or ingredient name. */
export function anvisaBularioSearchUrl(query: string): string {
  const q = encodeURIComponent(query.trim());
  return `https://consultas.anvisa.gov.br/#/bulario/q/?nome=${q}`;
}
