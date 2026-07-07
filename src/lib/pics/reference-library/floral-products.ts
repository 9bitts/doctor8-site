/** Unified floral catalog for prescriptions and consult templates. */

import {
  ALL_BACH_ESSENCES,
  BACH_RESCUE_ENTRIES,
  type BachEssenceEntry,
} from "./florais-bach";
import {
  SAINT_GERMAIN_COMPOUND_FORMULAS,
  SAINT_GERMAIN_ESSENCES,
  type FloralCatalogEntry,
} from "./florais-saint-germain";

export type FloralProductCategory =
  | "bach"
  | "bach_rescue"
  | "saint_germain"
  | "saint_germain_formula"
  | "custom";

export interface FloralReferenceProduct {
  value: string;
  labelKey: string;
  indicationKey: string;
  category: FloralProductCategory;
}

function mapBach(e: BachEssenceEntry): FloralReferenceProduct {
  return {
    value: e.value,
    labelKey: e.labelKey,
    indicationKey: e.negKey,
    category: "bach",
  };
}

function mapCatalog(e: FloralCatalogEntry, category: FloralProductCategory): FloralReferenceProduct {
  return { value: e.value, labelKey: e.labelKey, indicationKey: e.indicationKey, category };
}

export const FLORAL_REFERENCE_PRODUCTS: FloralReferenceProduct[] = [
  ...ALL_BACH_ESSENCES.map(mapBach),
  ...BACH_RESCUE_ENTRIES.map((e) => mapCatalog(e, "bach_rescue")),
  ...SAINT_GERMAIN_ESSENCES.map((e) => mapCatalog(e, "saint_germain")),
  ...SAINT_GERMAIN_COMPOUND_FORMULAS.map((e) => mapCatalog(e, "saint_germain_formula")),
  {
    value: "floral_custom",
    labelKey: "it.ref.floral.custom",
    indicationKey: "it.ref.floral.customInd",
    category: "custom",
  },
];

export const FLORAL_FORM_OPTIONS = FLORAL_REFERENCE_PRODUCTS.map((p) => ({
  value: p.value,
  labelKey: p.labelKey,
  category: p.category,
}));

export const FLORAL_CATEGORY_LABEL_KEYS: Record<FloralProductCategory, string> = {
  bach: "it.ref.floral.cat.bach",
  bach_rescue: "it.ref.floral.cat.bachRescue",
  saint_germain: "it.ref.floral.cat.saintGermain",
  saint_germain_formula: "it.ref.floral.cat.saintGermainFormula",
  custom: "it.ref.floral.cat.custom",
};

export function floralProductByValue(value: string) {
  return FLORAL_REFERENCE_PRODUCTS.find((p) => p.value === value);
}

export function floralProductsByCategory(category: FloralProductCategory) {
  return FLORAL_REFERENCE_PRODUCTS.filter((p) => p.category === category);
}
