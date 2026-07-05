import plantsJson from "./data/plants.json";
import teasJson from "./data/teas.json";
import catalogJson from "./data/catalog.json";
import studyJson from "./data/study.json";
import plantTrJson from "./data/plant-tr.json";
import teaTrJson from "./data/tea-tr.json";
import uiJson from "./data/ui.json";
import type {
  CatalogPlant,
  MedicinalPlantMeta,
  MedicinalTeaEntry,
  MedicinalTeasLang,
  PlantTranslation,
  StudySection,
  TeaTranslation,
} from "./types";

export const MEDICINAL_PLANTS = plantsJson as Record<string, MedicinalPlantMeta>;
export const MEDICINAL_TEAS = teasJson as MedicinalTeaEntry[];
export const MEDICINAL_CATALOG = catalogJson as CatalogPlant[];
export const MEDICINAL_STUDY = studyJson as StudySection[];

const PLANT_TR = plantTrJson as Record<MedicinalTeasLang, Record<string, PlantTranslation>>;
const TEA_TR = teaTrJson as Record<MedicinalTeasLang, Record<string, TeaTranslation>>;
const UI = uiJson as Record<MedicinalTeasLang, Record<string, unknown>>;

export function mtLang(raw: string): MedicinalTeasLang {
  if (raw === "en" || raw === "es" || raw === "pt") return raw;
  return "pt";
}

export function mtUi(lang: MedicinalTeasLang): Record<string, unknown> {
  return UI[lang] || UI.pt;
}

export function mtUiString(lang: MedicinalTeasLang, key: string): string {
  const dict = mtUi(lang);
  const val = dict[key];
  return typeof val === "string" ? val : (UI.pt[key] as string) || key;
}

export function mtPlantText(lang: MedicinalTeasLang, id: string): PlantTranslation | null {
  return PLANT_TR[lang]?.[id] || PLANT_TR.pt[id] || null;
}

export function mtTeaText(lang: MedicinalTeasLang, slug: string): TeaTranslation | null {
  return TEA_TR[lang]?.[slug] || TEA_TR.pt[slug] || null;
}

export function mtQuickTags(lang: MedicinalTeasLang): { label: string; term: string }[] {
  const tags = mtUi(lang).quickTags;
  if (Array.isArray(tags)) return tags as { label: string; term: string }[];
  return (UI.pt.quickTags as { label: string; term: string }[]) || [];
}

export function teasForPlant(plantId: string): MedicinalTeaEntry[] {
  return MEDICINAL_TEAS.filter((t) => t.plants.includes(plantId));
}

function normPlantKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function teasForCatalogPlant(plant: CatalogPlant, lang: MedicinalTeasLang): MedicinalTeaEntry[] {
  const plantKey = normPlantKey(plant.slug);
  const nameKey = normPlantKey(plant.name.split(/\s+/)[0]);

  return MEDICINAL_TEAS.filter((tea) =>
    tea.plants.some((pid) => {
      const pidKey = normPlantKey(pid);
      if (plantKey.includes(pidKey) || pidKey.includes(plantKey.split("-")[0])) return true;
      const pt = mtPlantText(lang, pid);
      if (!pt) return false;
      const ptKey = normPlantKey(pt.name.split(/\s+/)[0]);
      return ptKey === nameKey || plantKey.includes(ptKey) || ptKey.includes(nameKey);
    }),
  );
}

export function teaBySlug(slug: string): MedicinalTeaEntry | undefined {
  return MEDICINAL_TEAS.find((t) => t.slug === slug);
}

export function filterTeas(query: string, lang: MedicinalTeasLang): MedicinalTeaEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return MEDICINAL_TEAS;
  return MEDICINAL_TEAS.filter((tea) => {
    const tx = mtTeaText(lang, tea.slug);
    if (!tx) return false;
    const hay = `${tx.name} ${tx.symptom} ${tx.tagline} ${tea.slug}`.toLowerCase();
    if (hay.includes(q)) return true;
    return tea.plants.some((pid) => {
      const p = mtPlantText(lang, pid);
      return p && `${p.name} ${MEDICINAL_PLANTS[pid]?.sci || ""}`.toLowerCase().includes(q);
    });
  });
}

export function filterCatalog(query: string, lang: MedicinalTeasLang): CatalogPlant[] {
  const q = query.trim().toLowerCase();
  if (!q) return MEDICINAL_CATALOG;
  return MEDICINAL_CATALOG.filter((plant) => {
    const hay = `${plant.name} ${plant.sci} ${plant.sinonimia} ${plant.propriedades} ${plant.habitat}`.toLowerCase();
    if (hay.includes(q)) return true;
    return MEDICINAL_TEAS.some((tea) => {
      if (!tea.plants.some((pid) => {
        const meta = MEDICINAL_PLANTS[pid];
        const pt = mtPlantText(lang, pid);
        return pt?.name.toLowerCase().includes(plant.name.toLowerCase()) || meta?.sci === plant.sci;
      })) return false;
      const tx = mtTeaText(lang, tea.slug);
      return tx && `${tx.symptom} ${tx.name}`.toLowerCase().includes(q);
    });
  });
}
