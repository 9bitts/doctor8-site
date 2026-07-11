import type { DrugSearchResult } from "@/components/professional/prescriptions/DrugSearchResults";
import type { PrescriptionMedItem } from "@/components/professional/prescriptions/PrescriptionMedItemForm";
import type { MedicinaNaturalListItem } from "./search-server";

export type PrescriptionItemSearchMode = "medication" | "phytotherapy";

export function usesPhytoCatalogSearch(
  phytoOnly: boolean,
  mode: PrescriptionItemSearchMode,
): boolean {
  return phytoOnly || mode === "phytotherapy";
}

export function mapMnItemsToDrugResults(
  items: MedicinaNaturalListItem[],
): DrugSearchResult[] {
  return items.map((item) => ({
    id: item.slug,
    name: item.nome,
    activeIngredient: item.nomeCientifico || item.nome,
    dosage: item.posologia?.slice(0, 120) || "",
    presentation: item.indicacoes?.slice(0, 200) || "",
    pharmaceuticalForm: item.statusRegulatorio,
    manufacturer: "",
    controlled: false,
    prescriptionType: null,
  }));
}

export function phytoMedItemFromMnListItem(
  item: MedicinaNaturalListItem,
): PrescriptionMedItem {
  return {
    name: item.nome,
    dosage: item.posologia?.slice(0, 200) || "",
    frequency: "",
    duration: "",
    instructions: item.indicacoes?.slice(0, 500) || "",
    itemKind: "phytotherapy",
    mnSlug: item.slug,
  };
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

export async function fetchMnFitoterapicosForPrescription(
  apiBase: string,
  q: string,
): Promise<MedicinaNaturalListItem[]> {
  const url = `${apiBase}/medicina-natural/search?q=${encodeURIComponent(q)}&categoria=FITOTERAPICO&take=20`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.items ?? [];
}
