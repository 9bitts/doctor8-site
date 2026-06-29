import type { Lang } from "@/lib/i18n/translations";
import { translate } from "@/lib/i18n/translations";
import { PHYTOTHERAPY_REFERENCE_PRODUCTS } from "./phytotherapy-products";

export type ReferenceSectionId =
  | "phyto_formulary"
  | "tea_preparation"
  | "phyto_safety"
  | "homeo_care"
  | "acu_care";

export interface ReferenceSection {
  id: ReferenceSectionId;
  titleKey: string;
  bodyKeys: string[];
  /** For formulary: dynamic product lines */
  products?: typeof PHYTOTHERAPY_REFERENCE_PRODUCTS;
}

const SHARED_PHYTO: ReferenceSectionId[] = ["phyto_formulary", "tea_preparation", "phyto_safety"];

const SECTIONS_BY_PRACTICE: Record<string, ReferenceSectionId[]> = {
  fitoterapia: SHARED_PHYTO,
  homeopatia: ["homeo_care"],
  acupuntura: ["acu_care", "tea_preparation"],
};

const SECTION_DEFS: Record<ReferenceSectionId, Omit<ReferenceSection, "id">> = {
  phyto_formulary: {
    titleKey: "it.ref.phytoFormulary",
    bodyKeys: [],
    products: PHYTOTHERAPY_REFERENCE_PRODUCTS,
  },
  tea_preparation: {
    titleKey: "it.ref.teaPrep",
    bodyKeys: [
      "it.ref.tea.step1",
      "it.ref.tea.step2",
      "it.ref.tea.step3",
      "it.ref.tea.doseAdult",
    ],
  },
  phyto_safety: {
    titleKey: "it.ref.safety",
    bodyKeys: [
      "it.ref.safety.1",
      "it.ref.safety.2",
      "it.ref.safety.3",
      "it.ref.safety.4",
      "it.ref.safety.5",
    ],
  },
  homeo_care: {
    titleKey: "it.ref.homeoCare",
    bodyKeys: [
      "it.ref.homeo.1",
      "it.ref.homeo.2",
      "it.ref.homeo.3",
      "it.ref.homeo.4",
    ],
  },
  acu_care: {
    titleKey: "it.ref.acuCare",
    bodyKeys: [
      "it.ref.acu.1",
      "it.ref.acu.2",
      "it.ref.acu.3",
    ],
  },
};

export function getReferenceSections(practiceSlug: string): ReferenceSection[] {
  const ids = SECTIONS_BY_PRACTICE[practiceSlug] ?? [];
  return ids.map((id) => ({ id, ...SECTION_DEFS[id] }));
}

export function renderReferenceSectionBody(section: ReferenceSection, lang: Lang): string[] {
  if (section.products?.length) {
    return section.products.map((p) => {
      const name = translate(lang, p.labelKey);
      const indication = translate(lang, p.indicationKey);
      return `- ${name}: ${indication}`;
    });
  }
  return section.bodyKeys.map((k) => translate(lang, k));
}
