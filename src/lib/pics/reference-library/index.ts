import type { Lang } from "@/lib/i18n/translations";
import { translate } from "@/lib/i18n/translations";
import { PHYTOTHERAPY_REFERENCE_PRODUCTS } from "./phytotherapy-products";

export type ReferenceSectionId =
  | "phyto_formulary"
  | "tea_preparation"
  | "phyto_safety"
  | "homeo_care"
  | "acu_care"
  | "medit_care"
  | "yoga_care"
  | "art_care"
  | "shantala_care"
  | "reiki_care"
  | "aroma_care"
  | "biodanca_care"
  | "reflex_care"
  | "music_care"
  | "florais_care"
  | "ayur_care"
  | "hypno_care";

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
  meditacao: ["medit_care"],
  yoga: ["yoga_care"],
  arteterapia: ["art_care"],
  shantala: ["shantala_care"],
  reiki: ["reiki_care"],
  aromaterapia: ["aroma_care"],
  biodanca: ["biodanca_care"],
  reflexoterapia: ["reflex_care"],
  musicoterapia: ["music_care"],
  terapia_florais: ["florais_care"],
  ayurveda: ["ayur_care"],
  hipnoterapia: ["hypno_care"],
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
  medit_care: {
    titleKey: "it.ref.meditCare",
    bodyKeys: ["it.ref.medit.1", "it.ref.medit.2", "it.ref.medit.3"],
  },
  yoga_care: {
    titleKey: "it.ref.yogaCare",
    bodyKeys: ["it.ref.yoga.1", "it.ref.yoga.2", "it.ref.yoga.3"],
  },
  art_care: {
    titleKey: "it.ref.artCare",
    bodyKeys: ["it.ref.art.1", "it.ref.art.2"],
  },
  shantala_care: {
    titleKey: "it.ref.shantalaCare",
    bodyKeys: ["it.ref.shantala.1", "it.ref.shantala.2", "it.ref.shantala.3"],
  },
  reiki_care: {
    titleKey: "it.ref.reikiCare",
    bodyKeys: ["it.ref.reiki.1", "it.ref.reiki.2", "it.ref.reiki.3"],
  },
  aroma_care: {
    titleKey: "it.ref.aromaCare",
    bodyKeys: ["it.ref.aroma.1", "it.ref.aroma.2", "it.ref.aroma.3"],
  },
  biodanca_care: {
    titleKey: "it.ref.biodancaCare",
    bodyKeys: ["it.ref.biodanca.1", "it.ref.biodanca.2"],
  },
  reflex_care: {
    titleKey: "it.ref.reflexCare",
    bodyKeys: ["it.ref.reflex.1", "it.ref.reflex.2"],
  },
  music_care: {
    titleKey: "it.ref.musicCare",
    bodyKeys: ["it.ref.music.1", "it.ref.music.2"],
  },
  florais_care: {
    titleKey: "it.ref.floraisCare",
    bodyKeys: ["it.ref.florais.1", "it.ref.florais.2", "it.ref.florais.3"],
  },
  ayur_care: {
    titleKey: "it.ref.ayurCare",
    bodyKeys: ["it.ref.ayur.1", "it.ref.ayur.2"],
  },
  hypno_care: {
    titleKey: "it.ref.hypnoCare",
    bodyKeys: ["it.ref.hypno.1", "it.ref.hypno.2"],
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
