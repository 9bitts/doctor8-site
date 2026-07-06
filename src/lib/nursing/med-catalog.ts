/** Curated COFEN-scope medication categories for nursing electronic prescription (801/2024). */
export type NursingMedCatalogEntry = {
  id: string;
  categoryKey: string;
  labelKey: string;
  defaultRouteKey: string;
  defaultDosageHintKey?: string;
};

export const NURSING_MED_CATEGORIES = [
  { id: "vaccine", labelKey: "nurse.medRx.cat.vaccine" },
  { id: "insulin", labelKey: "nurse.medRx.cat.insulin" },
  { id: "oxygen", labelKey: "nurse.medRx.cat.oxygen" },
  { id: "wound_care", labelKey: "nurse.medRx.cat.woundCare" },
  { id: "analgesia_protocol", labelKey: "nurse.medRx.cat.analgesia" },
  { id: "other", labelKey: "nurse.medRx.cat.other" },
] as const;

export const NURSING_MED_CATALOG: NursingMedCatalogEntry[] = [
  { id: "hep_b", categoryKey: "vaccine", labelKey: "nurse.medRx.item.hepB", defaultRouteKey: "nurse.medRx.route.im", defaultDosageHintKey: "nurse.medRx.hint.vaccine" },
  { id: "flu", categoryKey: "vaccine", labelKey: "nurse.medRx.item.flu", defaultRouteKey: "nurse.medRx.route.im", defaultDosageHintKey: "nurse.medRx.hint.vaccine" },
  { id: "insulin_regular", categoryKey: "insulin", labelKey: "nurse.medRx.item.insulinRegular", defaultRouteKey: "nurse.medRx.route.sc", defaultDosageHintKey: "nurse.medRx.hint.insulin" },
  { id: "o2_continuous", categoryKey: "oxygen", labelKey: "nurse.medRx.item.o2", defaultRouteKey: "nurse.medRx.route.inhalation", defaultDosageHintKey: "nurse.medRx.hint.o2" },
  { id: "saline_dressing", categoryKey: "wound_care", labelKey: "nurse.medRx.item.salineDressing", defaultRouteKey: "nurse.medRx.route.topical", defaultDosageHintKey: "nurse.medRx.hint.topical" },
  { id: "dipyrone_protocol", categoryKey: "analgesia_protocol", labelKey: "nurse.medRx.item.dipyrone", defaultRouteKey: "nurse.medRx.route.vo", defaultDosageHintKey: "nurse.medRx.hint.analgesia" },
];

export const NURSING_MED_ROUTES = [
  { id: "vo", labelKey: "nurse.medRx.route.vo" },
  { id: "im", labelKey: "nurse.medRx.route.im" },
  { id: "iv", labelKey: "nurse.medRx.route.iv" },
  { id: "sc", labelKey: "nurse.medRx.route.sc" },
  { id: "topical", labelKey: "nurse.medRx.route.topical" },
  { id: "inhalation", labelKey: "nurse.medRx.route.inhalation" },
] as const;
