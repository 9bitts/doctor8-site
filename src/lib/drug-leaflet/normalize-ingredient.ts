/** Lowercase ASCII key for matching DrugLeaflet rows to DrugCatalog.activeIngredient */
export function normalizeActiveIngredientKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
