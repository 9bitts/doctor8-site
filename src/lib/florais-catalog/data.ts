import { translate, type Lang } from "@/lib/i18n/translations";
import {
  ALL_BACH_ESSENCES,
  BACH_EMOTIONAL_GROUPS,
  BACH_RESCUE_ENTRIES,
} from "@/lib/pics/reference-library/florais-bach";
import {
  SAINT_GERMAIN_COMPOUND_FORMULAS,
  SAINT_GERMAIN_ESSENCES,
} from "@/lib/pics/reference-library/florais-saint-germain";

export type FloralCatalogCategory =
  | "bach"
  | "bach_rescue"
  | "saint_germain"
  | "saint_germain_formula";

export interface FloralCatalogItem {
  slug: string;
  category: FloralCatalogCategory;
  groupKey?: string;
  labelKey: string;
  indicationKey: string;
  negKey?: string;
  posKey?: string;
}

export const FLORAL_CATEGORY_ACCENT: Record<FloralCatalogCategory, string> = {
  bach: "#ec4899",
  bach_rescue: "#f43f5e",
  saint_germain: "#8b5cf6",
  saint_germain_formula: "#e11d48",
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buildCatalog(): FloralCatalogItem[] {
  const items: FloralCatalogItem[] = [];

  for (const group of BACH_EMOTIONAL_GROUPS) {
    for (const e of group.essences) {
      items.push({
        slug: e.value,
        category: "bach",
        groupKey: group.groupKey,
        labelKey: e.labelKey,
        indicationKey: e.negKey,
        negKey: e.negKey,
        posKey: e.posKey,
      });
    }
  }

  for (const r of BACH_RESCUE_ENTRIES) {
    items.push({
      slug: r.value,
      category: "bach_rescue",
      labelKey: r.labelKey,
      indicationKey: r.indicationKey,
    });
  }

  for (const e of SAINT_GERMAIN_ESSENCES) {
    items.push({
      slug: e.value,
      category: "saint_germain",
      labelKey: e.labelKey,
      indicationKey: e.indicationKey,
    });
  }

  for (const f of SAINT_GERMAIN_COMPOUND_FORMULAS) {
    items.push({
      slug: f.value,
      category: "saint_germain_formula",
      labelKey: f.labelKey,
      indicationKey: f.indicationKey,
    });
  }

  return items;
}

export const FLORAL_CATALOG = buildCatalog();

export const FLORAL_STATS = {
  bach: ALL_BACH_ESSENCES.length,
  rescue: BACH_RESCUE_ENTRIES.length,
  saintGermain: SAINT_GERMAIN_ESSENCES.length,
  formulas: SAINT_GERMAIN_COMPOUND_FORMULAS.length,
  total: FLORAL_CATALOG.length,
};

export function floralBySlug(slug: string): FloralCatalogItem | undefined {
  return FLORAL_CATALOG.find((i) => i.slug === slug);
}

export function floralCategoryLabelKey(category: FloralCatalogCategory): string {
  return `fl.cat.${category}`;
}

export function filterFloralCatalog(query: string, lang: Lang): FloralCatalogItem[] {
  const q = norm(query.trim());
  if (!q) return FLORAL_CATALOG;

  return FLORAL_CATALOG.filter((item) => {
    const label = norm(translate(lang, item.labelKey));
    const indication = norm(translate(lang, item.indicationKey));
    const pos = item.posKey ? norm(translate(lang, item.posKey)) : "";
    const group = item.groupKey ? norm(translate(lang, item.groupKey)) : "";
    return (
      label.includes(q) ||
      indication.includes(q) ||
      pos.includes(q) ||
      group.includes(q) ||
      item.slug.includes(q)
    );
  });
}

export const FLORAL_QUICK_TAGS = [
  { labelKey: "fl.tag.ansiedade", term: "ansiedade" },
  { labelKey: "fl.tag.medo", term: "medo" },
  { labelKey: "fl.tag.sono", term: "sono" },
  { labelKey: "fl.tag.estresse", term: "estresse" },
  { labelKey: "fl.tag.panico", term: "pânico" },
  { labelKey: "fl.tag.protecao", term: "proteção" },
  { labelKey: "fl.tag.depressao", term: "depressão" },
  { labelKey: "fl.tag.estudante", term: "estud" },
] as const;

export function floralsByCategory(category: FloralCatalogCategory): FloralCatalogItem[] {
  return FLORAL_CATALOG.filter((i) => i.category === category);
}

export { BACH_EMOTIONAL_GROUPS };
