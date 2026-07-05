import type { Lang } from "@/lib/i18n/translations";
import { translate } from "@/lib/i18n/translations";
import { BACH_ESSENCE_GROUPS, BACH_RESCUE_KEYS } from "./florais-bach";
import { PHYTOTHERAPY_REFERENCE_PRODUCTS } from "./phytotherapy-products";

export type ReferenceSectionId =
  | "phyto_formulary"
  | "tea_preparation"
  | "phyto_safety"
  | "phyto_forms"
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
  | "bach_essences"
  | "ayur_care"
  | "hypno_care"
  | "antro_care"
  | "api_care"
  | "bioen_care"
  | "constel_care"
  | "cromo_care"
  | "dcircular_care"
  | "geo_care"
  | "impos_care"
  | "naturo_care"
  | "osteo_care"
  | "ozonio_care"
  | "quiro_care"
  | "tcom_care"
  | "termal_care";

export interface ReferenceSection {
  id: ReferenceSectionId;
  titleKey: string;
  bodyKeys: string[];
  /** For formulary: dynamic product lines */
  products?: typeof PHYTOTHERAPY_REFERENCE_PRODUCTS;
}

const SHARED_PHYTO: ReferenceSectionId[] = [
  "phyto_formulary",
  "phyto_forms",
  "tea_preparation",
  "phyto_safety",
];

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
  terapia_florais: ["florais_care", "bach_essences"],
  ayurveda: ["ayur_care"],
  hipnoterapia: ["hypno_care"],
  antroposofia: ["antro_care"],
  apiterapia: ["api_care"],
  bioenergetica: ["bioen_care"],
  constelacao_familiar: ["constel_care"],
  cromoterapia: ["cromo_care"],
  danca_circular: ["dcircular_care"],
  geoterapia: ["geo_care"],
  imposicao_maos: ["impos_care"],
  naturopatia: ["naturo_care"],
  osteopatia: ["osteo_care"],
  ozonioterapia: ["ozonio_care"],
  quiropraxia: ["quiro_care"],
  terapia_comunitaria: ["tcom_care"],
  termalismo: ["termal_care"],
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
  phyto_forms: {
    titleKey: "it.ref.phytoForms",
    bodyKeys: [
      "it.ref.phytoForms.1",
      "it.ref.phytoForms.2",
      "it.ref.phytoForms.3",
      "it.ref.phytoForms.4",
      "it.ref.phytoForms.5",
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
  bach_essences: {
    titleKey: "it.ref.bach.title",
    bodyKeys: [],
  },
  ayur_care: {
    titleKey: "it.ref.ayurCare",
    bodyKeys: ["it.ref.ayur.1", "it.ref.ayur.2"],
  },
  hypno_care: {
    titleKey: "it.ref.hypnoCare",
    bodyKeys: ["it.ref.hypno.1", "it.ref.hypno.2"],
  },
  antro_care: {
    titleKey: "it.ref.antroCare",
    bodyKeys: ["it.ref.antro.1", "it.ref.antro.2", "it.ref.antro.3"],
  },
  api_care: {
    titleKey: "it.ref.apiCare",
    bodyKeys: ["it.ref.api.1", "it.ref.api.2", "it.ref.api.3"],
  },
  bioen_care: {
    titleKey: "it.ref.bioenCare",
    bodyKeys: ["it.ref.bioen.1", "it.ref.bioen.2"],
  },
  constel_care: {
    titleKey: "it.ref.constelCare",
    bodyKeys: ["it.ref.constel.1", "it.ref.constel.2"],
  },
  cromo_care: {
    titleKey: "it.ref.cromoCare",
    bodyKeys: ["it.ref.cromo.1", "it.ref.cromo.2"],
  },
  dcircular_care: {
    titleKey: "it.ref.dcircularCare",
    bodyKeys: ["it.ref.dcircular.1", "it.ref.dcircular.2"],
  },
  geo_care: {
    titleKey: "it.ref.geoCare",
    bodyKeys: ["it.ref.geo.1", "it.ref.geo.2"],
  },
  impos_care: {
    titleKey: "it.ref.imposCare",
    bodyKeys: ["it.ref.impos.1", "it.ref.impos.2"],
  },
  naturo_care: {
    titleKey: "it.ref.naturoCare",
    bodyKeys: ["it.ref.naturo.1", "it.ref.naturo.2"],
  },
  osteo_care: {
    titleKey: "it.ref.osteoCare",
    bodyKeys: ["it.ref.osteo.1", "it.ref.osteo.2"],
  },
  ozonio_care: {
    titleKey: "it.ref.ozonioCare",
    bodyKeys: ["it.ref.ozonio.1", "it.ref.ozonio.2"],
  },
  quiro_care: {
    titleKey: "it.ref.quiroCare",
    bodyKeys: ["it.ref.quiro.1", "it.ref.quiro.2"],
  },
  tcom_care: {
    titleKey: "it.ref.tcomCare",
    bodyKeys: ["it.ref.tcom.1", "it.ref.tcom.2"],
  },
  termal_care: {
    titleKey: "it.ref.termalCare",
    bodyKeys: ["it.ref.termal.1", "it.ref.termal.2"],
  },
};

export function getReferenceSections(practiceSlug: string): ReferenceSection[] {
  const ids = SECTIONS_BY_PRACTICE[practiceSlug] ?? [];
  return ids.map((id) => ({ id, ...SECTION_DEFS[id] }));
}

export function renderReferenceSectionBody(section: ReferenceSection, lang: Lang): string[] {
  if (section.id === "bach_essences") {
    const lines: string[] = [translate(lang, "it.ref.bach.intro")];
    for (const group of BACH_ESSENCE_GROUPS) {
      lines.push("");
      lines.push(translate(lang, group.groupKey));
      for (const key of group.essenceKeys) {
        lines.push(`  • ${translate(lang, key)}`);
      }
    }
    lines.push("");
    lines.push(translate(lang, "it.ref.bach.rescueTitle"));
    for (const key of BACH_RESCUE_KEYS) {
      lines.push(`  • ${translate(lang, key)}`);
    }
    return lines;
  }

  if (section.products?.length) {
    const productLines = section.products.map((p) => {
      const name = translate(lang, p.labelKey);
      const indication = translate(lang, p.indicationKey);
      return `- ${name}: ${indication}`;
    });
    if (section.id === "phyto_formulary") {
      return [translate(lang, "it.ref.phyto.renameNote"), "", ...productLines];
    }
    return productLines;
  }
  return section.bodyKeys.map((k) => translate(lang, k));
}
