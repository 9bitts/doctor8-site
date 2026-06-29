/** National phytotherapy reference list ? form options and clinical lookup. */
export const PHYTOTHERAPY_REFERENCE_PRODUCTS = [
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
  { value: "planta_medicinal", labelKey: "it.tpl.phyto.medicinalPlant", indicationKey: "it.ref.phyto.plantInd" },
  { value: "other", labelKey: "it.tpl.phyto.other", indicationKey: "it.ref.phyto.otherInd" },
] as const;

export const PHYTOTHERAPY_FORM_OPTIONS = PHYTOTHERAPY_REFERENCE_PRODUCTS.map((p) => ({
  value: p.value,
  labelKey: p.labelKey,
}));
