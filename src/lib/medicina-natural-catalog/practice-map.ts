import type { CategoriaPratica } from "@/lib/medicina-natural/item-types";

/** URL segment under /medicina-natural/{practice}/ → Prisma enum. */
export const CATEGORIA_BY_PRACTICE_URL: Record<string, CategoriaPratica> = {
  fitoterapia: "FITOTERAPICO",
  "terapia-florais": "FLORAL",
  aromaterapia: "AROMATERAPIA",
  homeopatia: "HOMEOPATIA",
  apiterapia: "APITERAPIA",
};

export function categoriaFromPracticeUrl(urlSlug: string): CategoriaPratica | null {
  return CATEGORIA_BY_PRACTICE_URL[urlSlug] ?? null;
}
