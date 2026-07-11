export function normalizeSearchText(parts: (string | null | undefined)[]): string {
  return parts
    .filter((p): p is string => Boolean(p?.trim()))
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function slugFromNomeCientifico(nomeCientifico: string): string {
  return normalizeSearchText([nomeCientifico]).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
