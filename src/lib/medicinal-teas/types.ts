export type PlantIconType = "leaf" | "root" | "bark" | "flower" | "seed" | "fruit" | "bulb";

export interface MedicinalPlantMeta {
  sci: string;
  icon: PlantIconType;
}

export interface MedicinalTeaEntry {
  slug: string;
  accent: string;
  plants: string[];
}

export interface PlantTranslation {
  name: string;
  part: string;
  ondeNasce: string;
  aquisicao: string;
  propriedades: string;
}

export interface TeaTranslation {
  name: string;
  symptom: string;
  tagline: string;
  modo: string;
}

export interface CatalogPlant {
  slug: string;
  name: string;
  sci: string;
  sinonimia: string;
  partes: string;
  caracteristicas: string;
  habitat: string;
  propriedades: string;
  photos: string[];
}

export interface StudyBlock {
  p?: string;
  h?: string;
  list?: string[];
  link?: { href: string; label: string };
}

export interface StudySection {
  title: string;
  blocks: StudyBlock[];
}

export type MedicinalTeasPortal = "professional" | "integrative-therapist";

export type MedicinalTeasLang = "pt" | "en" | "es";
