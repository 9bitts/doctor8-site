import type { NaturalMedicinePracticeId } from "@/lib/natural-medicine/config";
import type { PrescriptionItemKind } from "@/lib/prescription-item-kind";
import { itemKindForPractice } from "./mn-template-utils";

export interface MnCatalogStarterTemplate {
  id: string;
  practiceId: NaturalMedicinePracticeId;
  nameKey: string;
  previewKey: string;
  mnSlug: string;
  dosage?: string;
}

export const MN_CATALOG_STARTER_TEMPLATES: MnCatalogStarterTemplate[] = [
  {
    id: "phyto_valeriana",
    practiceId: "fitoterapia",
    nameKey: "nm.starter.phyto.valeriana",
    previewKey: "nm.starter.phyto.valerianaPreview",
    mnSlug: "fitoterapico-valeriana-officinalis-l",
    dosage: "Extrato seco 300mg — 1 cápsula à noite",
  },
  {
    id: "phyto_camomila",
    practiceId: "fitoterapia",
    nameKey: "nm.starter.phyto.camomila",
    previewKey: "nm.starter.phyto.camomilaPreview",
    mnSlug: "fitoterapico-matricaria-chamomilla-l",
    dosage: "Chá ou extrato — conforme monografia",
  },
  {
    id: "homeo_arnica_trauma",
    practiceId: "homeopatia",
    nameKey: "nm.starter.homeo.arnica",
    previewKey: "nm.starter.homeo.arnicaPreview",
    mnSlug: "arnica_montana",
    dosage: "9CH ou 30CH — 3–5 glóbulos 3–4x/dia pós-trauma",
  },
  {
    id: "homeo_ignatia",
    practiceId: "homeopatia",
    nameKey: "nm.starter.homeo.ignatia",
    previewKey: "nm.starter.homeo.ignatiaPreview",
    mnSlug: "ignatia_amara",
    dosage: "30CH — 1 dose ou 3x/dia conforme intensidade",
  },
  {
    id: "homeo_nux_vomica",
    practiceId: "homeopatia",
    nameKey: "nm.starter.homeo.nux",
    previewKey: "nm.starter.homeo.nuxPreview",
    mnSlug: "nux_vomica",
    dosage: "30CH — 1 dose à noite ou 3x/dia",
  },
  {
    id: "aroma_lavanda_sono",
    practiceId: "aromaterapia",
    nameKey: "nm.starter.aroma.lavanda",
    previewKey: "nm.starter.aroma.lavandaPreview",
    mnSlug: "lavanda",
    dosage: "Difusão: 3–5 gotas à noite",
  },
  {
    id: "aroma_melaleuca",
    practiceId: "aromaterapia",
    nameKey: "nm.starter.aroma.melaleuca",
    previewKey: "nm.starter.aroma.melaleucaPreview",
    mnSlug: "melaleuca",
    dosage: "Tópico 5–10% em óleo carreador, 1–2x/dia",
  },
  {
    id: "api_propolis",
    practiceId: "apiterapia",
    nameKey: "nm.starter.api.propolis",
    previewKey: "nm.starter.api.propolisPreview",
    mnSlug: "propolis",
    dosage: "Extrato — 20 gotas em água, 2x/dia",
  },
  {
    id: "api_geleia_real",
    practiceId: "apiterapia",
    nameKey: "nm.starter.api.geleia",
    previewKey: "nm.starter.api.geleiaPreview",
    mnSlug: "geleia_real",
    dosage: "500mg — 1 cápsula pela manhã",
  },
];

export function mnStartersForPractice(
  practiceId: NaturalMedicinePracticeId,
): MnCatalogStarterTemplate[] {
  return MN_CATALOG_STARTER_TEMPLATES.filter((s) => s.practiceId === practiceId);
}

export function mnStarterItemKind(starter: MnCatalogStarterTemplate): PrescriptionItemKind {
  return itemKindForPractice(starter.practiceId);
}
