import type { DrugLeafletSectionKey } from "./types";

/** Portuguese section titles aligned with ANVISA bula profissional structure. */
export const LEAFLET_SECTION_TITLES: Record<DrugLeafletSectionKey, string> = {
  identificacao: "Identificação do medicamento",
  indicacoes: "Indicações",
  contraindicacoes: "Contraindicações",
  precaucoes: "Advertências e precauções",
  interacoes: "Interações medicamentosas",
  reacoes_adversas: "Reações adversas",
  posologia: "Posologia e modo de usar",
  superdose: "Superdose",
  farmacologia: "Farmacologia",
  gestacao_pediatria: "Gestação, lactação e pediatria",
  referencia: "Referência",
};

export function leafletSectionTitle(key: DrugLeafletSectionKey): string {
  return LEAFLET_SECTION_TITLES[key];
}
