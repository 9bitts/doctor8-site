import type { DrugSearchResult } from "@/components/professional/prescriptions/DrugSearchResults";
import type { PrescriptionMedItem } from "@/components/professional/prescriptions/PrescriptionMedItemForm";
import type { CategoriaPratica } from "@/lib/medicina-natural/item-types";
import {
  formatCannabisComposition,
  parseDetalhesCannabis,
} from "@/lib/medicina-natural/cannabis-display";
import type { PrescriptionItemKind } from "@/lib/prescription-item-kind";
import type { MedicinaNaturalListItem } from "./search-server";

export type PrescriptionItemSearchMode =
  | "medication"
  | "phytotherapy"
  | "floral"
  | "homeopathy"
  | "aromatherapy"
  | "apitherapy"
  | "cannabis";

const SEARCH_MODE_TO_CATEGORIA: Partial<
  Record<PrescriptionItemSearchMode, CategoriaPratica>
> = {
  phytotherapy: "FITOTERAPICO",
  floral: "FLORAL",
  homeopathy: "HOMEOPATIA",
  aromatherapy: "AROMATERAPIA",
  apitherapy: "APITERAPIA",
  cannabis: "CANNABIS",
};

const SEARCH_MODE_TO_ITEM_KIND: Partial<
  Record<PrescriptionItemSearchMode, PrescriptionItemKind>
> = {
  phytotherapy: "phytotherapy",
  floral: "floral",
  homeopathy: "homeopathy",
  aromatherapy: "aromatherapy",
  apitherapy: "apitherapy",
  cannabis: "cannabis",
};

export function resolveMnCatalogCategoria(params: {
  allowFloral: boolean;
  phytoOnly: boolean;
  itemSearchMode: PrescriptionItemSearchMode;
  floralOnly: boolean;
}): CategoriaPratica | null {
  const { allowFloral, phytoOnly, itemSearchMode, floralOnly } = params;
  if (floralOnly && allowFloral) return "FLORAL";
  if (phytoOnly && itemSearchMode === "medication") return "FITOTERAPICO";
  const cat = SEARCH_MODE_TO_CATEGORIA[itemSearchMode];
  if (!cat) return null;
  if (cat === "FLORAL" && !allowFloral) return null;
  return cat;
}

/** @deprecated use resolveMnCatalogCategoria */
export function usesPhytoCatalogSearch(
  phytoOnly: boolean,
  mode: PrescriptionItemSearchMode,
  floralOnly = false,
): boolean {
  return resolveMnCatalogCategoria({
    allowFloral: true,
    phytoOnly,
    itemSearchMode: mode,
    floralOnly,
  }) === "FITOTERAPICO";
}

/** @deprecated use resolveMnCatalogCategoria */
export function usesFloralCatalogSearch(allowFloral: boolean, floralOnly: boolean): boolean {
  return allowFloral && floralOnly;
}

export function mapMnItemsToDrugResults(
  items: MedicinaNaturalListItem[],
  mode?: PrescriptionItemSearchMode,
): DrugSearchResult[] {
  return items.map((item) => {
    const det = mode === "cannabis" ? parseDetalhesCannabis(item.detalhesEspecificos) : null;
    const composition = det ? formatCannabisComposition(det) : "";
    return {
      id: item.slug,
      name: item.nome,
      activeIngredient: item.nomeCientifico || item.nome,
      dosage: item.posologia?.slice(0, 120) || "",
      presentation: composition || item.indicacoes?.slice(0, 200) || "",
      pharmaceuticalForm: det?.formaFarmaceutica.replace(/_/g, " ") || item.statusRegulatorio,
      manufacturer: "",
      controlled: det?.tipoReceituario === "A" || det?.thcAcimaLimite === true,
      prescriptionType: det?.tipoReceituario === "A" ? "A1" : null,
    };
  });
}

function mnMedItemFromListItem(
  item: MedicinaNaturalListItem,
  itemKind: PrescriptionItemKind,
  defaultDosage?: string,
): PrescriptionMedItem {
  return {
    name: item.nome,
    dosage: item.posologia?.slice(0, 200) || defaultDosage || "",
    frequency: "",
    duration: "",
    instructions: item.indicacoes?.slice(0, 500) || "",
    itemKind,
    mnSlug: item.slug,
    renisus: item.renisus,
  };
}

export function phytoMedItemFromMnListItem(
  item: MedicinaNaturalListItem,
): PrescriptionMedItem {
  return mnMedItemFromListItem(item, "phytotherapy");
}

export function phytoMedItemFromDrugResult(drug: DrugSearchResult): PrescriptionMedItem {
  return {
    name: drug.name,
    dosage: drug.dosage?.trim() || "",
    frequency: "",
    duration: "",
    instructions: drug.presentation?.trim() || "",
    itemKind: "phytotherapy",
    mnSlug: drug.id,
  };
}

export function floralMedItemFromMnListItem(
  item: MedicinaNaturalListItem,
): PrescriptionMedItem {
  return mnMedItemFromListItem(item, "floral", "4 gotas, 4x/dia");
}

export function floralMedItemFromDrugResult(drug: DrugSearchResult): PrescriptionMedItem {
  return {
    name: drug.name,
    dosage: drug.dosage?.trim() || "4 gotas, 4x/dia",
    frequency: "",
    duration: "",
    instructions: drug.presentation?.trim() || "",
    itemKind: "floral",
    mnSlug: drug.id,
  };
}

export function cannabisMedItemFromMnListItem(
  item: MedicinaNaturalListItem,
): PrescriptionMedItem {
  const det = parseDetalhesCannabis(item.detalhesEspecificos);
  const composition = det ? formatCannabisComposition(det) : "";
  return {
    name: item.nome,
    dosage: item.posologia?.slice(0, 200) || "",
    frequency: "",
    duration: "",
    instructions: item.indicacoes?.slice(0, 500) || "",
    presentation: composition,
    pharmaceuticalForm: det?.formaFarmaceutica.replace(/_/g, " ") || "",
    itemKind: "cannabis",
    mnSlug: item.slug,
    controlled: det?.tipoReceituario === "A" || det?.thcAcimaLimite === true,
    prescriptionType: det?.tipoReceituario === "A" ? "A1" : null,
  };
}

export function mnMedItemFromListItemForMode(
  item: MedicinaNaturalListItem,
  mode: PrescriptionItemSearchMode,
): PrescriptionMedItem {
  if (mode === "cannabis") return cannabisMedItemFromMnListItem(item);
  const kind = SEARCH_MODE_TO_ITEM_KIND[mode] || "phytotherapy";
  const defaultDosage = mode === "floral" ? "4 gotas, 4x/dia" : "";
  return mnMedItemFromListItem(item, kind, defaultDosage);
}

export function mnMedItemFromDrugResultForMode(
  drug: DrugSearchResult,
  mode: PrescriptionItemSearchMode,
): PrescriptionMedItem {
  if (mode === "floral") return floralMedItemFromDrugResult(drug);
  if (mode === "phytotherapy") return phytoMedItemFromDrugResult(drug);
  if (mode === "cannabis") {
    return {
      name: drug.name,
      dosage: drug.dosage?.trim() || "",
      frequency: "",
      duration: "",
      instructions: drug.presentation?.trim() || "",
      presentation: drug.presentation?.trim() || "",
      itemKind: "cannabis",
      mnSlug: drug.id,
      controlled: drug.controlled,
    };
  }
  const kind = SEARCH_MODE_TO_ITEM_KIND[mode] || "phytotherapy";
  return {
    name: drug.name,
    dosage: drug.dosage?.trim() || "",
    frequency: "",
    duration: "",
    instructions: drug.presentation?.trim() || "",
    itemKind: kind,
    mnSlug: drug.id,
  };
}

export async function fetchMnFitoterapicosForPrescription(
  apiBase: string,
  q: string,
): Promise<MedicinaNaturalListItem[]> {
  return fetchMnByCategoriaForPrescription(apiBase, q, "FITOTERAPICO");
}

export async function fetchMnFloraisForPrescription(
  apiBase: string,
  q: string,
): Promise<MedicinaNaturalListItem[]> {
  return fetchMnByCategoriaForPrescription(apiBase, q, "FLORAL");
}

export async function fetchMnByCategoriaForPrescription(
  apiBase: string,
  q: string,
  categoria: CategoriaPratica,
): Promise<MedicinaNaturalListItem[]> {
  const url = `${apiBase}/medicina-natural/search?q=${encodeURIComponent(q)}&categoria=${categoria}&take=20`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.items ?? [];
}

export const MN_ADD_PARAM_TO_MODE: Record<string, PrescriptionItemSearchMode> = {
  phytotherapy: "phytotherapy",
  floral: "floral",
  homeopathy: "homeopathy",
  aromatherapy: "aromatherapy",
  apitherapy: "apitherapy",
  cannabis: "cannabis",
};

export const MN_ADD_PARAM_TO_ITEM_KIND: Record<string, PrescriptionItemKind> = {
  phytotherapy: "phytotherapy",
  floral: "floral",
  homeopathy: "homeopathy",
  aromatherapy: "aromatherapy",
  apitherapy: "apitherapy",
  cannabis: "cannabis",
};

/** i18n key for catalog search input placeholder by active MN mode. */
export function mnCatalogSearchI18nKey(
  mode: PrescriptionItemSearchMode,
  floralOnly: boolean,
): string {
  if (floralOnly || mode === "floral") return "rx.floralCatalogSearch";
  const keys: Partial<Record<PrescriptionItemSearchMode, string>> = {
    phytotherapy: "rx.phytoCatalogSearch",
    homeopathy: "rx.homeopathyCatalogSearch",
    aromatherapy: "rx.aromatherapyCatalogSearch",
    apitherapy: "rx.apitherapyCatalogSearch",
    cannabis: "rx.cannabisCatalogSearch",
  };
  return keys[mode] || "rx.phytoCatalogSearch";
}

/** i18n key for MN catalog search modal title by active mode. */
export function mnSearchModalTitleI18nKey(
  mode: PrescriptionItemSearchMode,
  floralOnly: boolean,
): string {
  if (floralOnly || mode === "floral") return "rx.mnSearchModalTitle.floral";
  const keys: Partial<Record<PrescriptionItemSearchMode, string>> = {
    phytotherapy: "rx.mnSearchModalTitle.phytotherapy",
    homeopathy: "rx.mnSearchModalTitle.homeopathy",
    aromatherapy: "rx.mnSearchModalTitle.aromatherapy",
    apitherapy: "rx.mnSearchModalTitle.apitherapy",
    cannabis: "rx.mnSearchModalTitle.cannabis",
  };
  return keys[mode] || "rx.mnSearchModalTitle.phytotherapy";
}

/** i18n key for free-text item placeholder by MN item kind. */
export function mnFreeTextPlaceholderI18nKey(
  kind: PrescriptionItemKind,
): string | null {
  const keys: Partial<Record<PrescriptionItemKind, string>> = {
    phytotherapy: "rx.phytoFreeTextPlaceholder",
    homeopathy: "rx.homeopathyFreeTextPlaceholder",
    aromatherapy: "rx.aromatherapyFreeTextPlaceholder",
    apitherapy: "rx.apitherapyFreeTextPlaceholder",
  };
  return keys[kind] ?? null;
}
