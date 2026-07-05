/** National phytotherapy reference list — RENAME + MFFB / Renisus common species. */
export const PHYTOTHERAPY_REFERENCE_PRODUCTS = [
  // RENAME (SUS)
  { value: "alcachofra", labelKey: "it.tpl.phyto.alcachofra", indicationKey: "it.ref.phyto.alcachofraInd" },
  { value: "aroeira", labelKey: "it.tpl.phyto.aroeira", indicationKey: "it.ref.phyto.aroeiraInd" },
  { value: "babosa", labelKey: "it.tpl.phyto.babosa", indicationKey: "it.ref.phyto.babosaInd" },
  { value: "cascara_sagrada", labelKey: "it.tpl.phyto.cascara", indicationKey: "it.ref.phyto.cascaraInd" },
  { value: "espinheira_santa", labelKey: "it.tpl.phyto.espinheira", indicationKey: "it.ref.phyto.espinheiraInd" },
  { value: "guaco", labelKey: "it.tpl.phyto.guaco", indicationKey: "it.ref.phyto.guacoInd" },
  { value: "garra_diabo", labelKey: "it.tpl.phyto.garra", indicationKey: "it.ref.phyto.garraInd" },
  { value: "hortela", labelKey: "it.tpl.phyto.hortela", indicationKey: "it.ref.phyto.hortelaInd" },
  { value: "isoflavona_soja", labelKey: "it.tpl.phyto.soja", indicationKey: "it.ref.phyto.sojaInd" },
  { value: "plantago", labelKey: "it.tpl.phyto.plantago", indicationKey: "it.ref.phyto.plantagoInd" },
  { value: "salgueiro", labelKey: "it.tpl.phyto.salgueiro", indicationKey: "it.ref.phyto.salgueiroInd" },
  { value: "unha_gato", labelKey: "it.tpl.phyto.unha", indicationKey: "it.ref.phyto.unhaInd" },
  // MFFB / Renisus — frequent in clinical practice
  { value: "valeriana", labelKey: "it.tpl.phyto.valeriana", indicationKey: "it.ref.phyto.valerianaInd" },
  { value: "passiflora", labelKey: "it.tpl.phyto.passiflora", indicationKey: "it.ref.phyto.passifloraInd" },
  { value: "camomila", labelKey: "it.tpl.phyto.camomila", indicationKey: "it.ref.phyto.camomilaInd" },
  { value: "ginkgo", labelKey: "it.tpl.phyto.ginkgo", indicationKey: "it.ref.phyto.ginkgoInd" },
  { value: "hamamelis", labelKey: "it.tpl.phyto.hamamelis", indicationKey: "it.ref.phyto.hamamelisInd" },
  { value: "boldo", labelKey: "it.tpl.phyto.boldo", indicationKey: "it.ref.phyto.boldoInd" },
  { value: "melissa", labelKey: "it.tpl.phyto.melissa", indicationKey: "it.ref.phyto.melissaInd" },
  { value: "centella", labelKey: "it.tpl.phyto.centella", indicationKey: "it.ref.phyto.centellaInd" },
  { value: "curcuma", labelKey: "it.tpl.phyto.curcuma", indicationKey: "it.ref.phyto.curcumaInd" },
  { value: "equinacea", labelKey: "it.tpl.phyto.equinacea", indicationKey: "it.ref.phyto.equinaceaInd" },
  { value: "hypericum", labelKey: "it.tpl.phyto.hypericum", indicationKey: "it.ref.phyto.hypericumInd" },
  { value: "crataegus", labelKey: "it.tpl.phyto.crataegus", indicationKey: "it.ref.phyto.crataegusInd" },
  { value: "cavalinha", labelKey: "it.tpl.phyto.cavalinha", indicationKey: "it.ref.phyto.cavalinhaInd" },
  { value: "dente_leao", labelKey: "it.tpl.phyto.denteLeao", indicationKey: "it.ref.phyto.denteLeaoInd" },
  { value: "macela", labelKey: "it.tpl.phyto.macela", indicationKey: "it.ref.phyto.macelaInd" },
  { value: "barbatimao", labelKey: "it.tpl.phyto.barbatimao", indicationKey: "it.ref.phyto.barbatimaoInd" },
  { value: "capim_limao", labelKey: "it.tpl.phyto.capimLimao", indicationKey: "it.ref.phyto.capimLimaoInd" },
  { value: "hibiscus", labelKey: "it.tpl.phyto.hibiscus", indicationKey: "it.ref.phyto.hibiscusInd" },
  { value: "senna", labelKey: "it.tpl.phyto.senna", indicationKey: "it.ref.phyto.sennaInd" },
  { value: "arnica", labelKey: "it.tpl.phyto.arnica", indicationKey: "it.ref.phyto.arnicaInd" },
  { value: "planta_medicinal", labelKey: "it.tpl.phyto.medicinalPlant", indicationKey: "it.ref.phyto.plantInd" },
  { value: "other", labelKey: "it.tpl.phyto.other", indicationKey: "it.ref.phyto.otherInd" },
] as const;

export const PHYTOTHERAPY_FORM_OPTIONS = PHYTOTHERAPY_REFERENCE_PRODUCTS.map((p) => ({
  value: p.value,
  labelKey: p.labelKey,
}));

export const PHYTOTHERAPY_RENAME_COUNT = 12;

export function phytotherapyProductByValue(value: string) {
  return PHYTOTHERAPY_REFERENCE_PRODUCTS.find((p) => p.value === value);
}
