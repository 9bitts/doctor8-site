import type { CategoriaPratica } from "@/lib/medicina-natural/item-types";

/** URL segment under /medicina-natural/{practice}/ → Prisma enum. */
export const CATEGORIA_BY_PRACTICE_URL: Record<string, CategoriaPratica> = {
  fitoterapia: "FITOTERAPICO",
  "terapia-florais": "FLORAL",
  aromaterapia: "AROMATERAPIA",
  homeopatia: "HOMEOPATIA",
  apiterapia: "APITERAPIA",
  cannabis: "CANNABIS",
};

export function categoriaFromPracticeUrl(urlSlug: string): CategoriaPratica | null {
  return CATEGORIA_BY_PRACTICE_URL[urlSlug] ?? null;
}

export const PRACTICE_URL_BY_CATEGORIA: Record<CategoriaPratica, string> = {
  FITOTERAPICO: "fitoterapia",
  FLORAL: "terapia-florais",
  AROMATERAPIA: "aromaterapia",
  HOMEOPATIA: "homeopatia",
  APITERAPIA: "apiterapia",
  CANNABIS: "cannabis",
};

export function practiceUrlFromCategoria(categoria: CategoriaPratica): string {
  return PRACTICE_URL_BY_CATEGORIA[categoria];
}
