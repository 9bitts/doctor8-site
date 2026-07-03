// Client-safe SEO slug helpers (no server/db imports).

import { getProfessionLabel, PSYCHOANALYSIS_SPECIALTY } from "@/lib/professions";
import { INTEGRATIVE_THERAPY_SPECIALTY } from "@/lib/integrative-therapy-specialty";
import { picBySlug, picLabel } from "@/lib/pics/practices";
import type { Lang } from "@/lib/i18n/translations";

export const INTEGRATIVE_SEO_SLUG = "terapeuta-integrativo";

export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://doctor8.app";

/** Portuguese SEO slugs for common specialties (Doctoralia-style URLs). */
export const SPECIALTY_SEO_SLUG: Record<string, string> = {
  "Gynecology and Obstetrics": "ginecologista",
  "Psychiatry": "psiquiatra",
  "Psychologist": "psicologo",
  "Psychoanalyst": "psicanalista",
  "Nutritionist": "nutricionista",
  "Dietitian": "nutricionista",
  "Orthopedics and Traumatology": "ortopedista",
  "Dermatology": "dermatologista",
  "Endocrinology and Metabolism": "endocrinologista",
  "Ophthalmology": "oftalmologista",
  "Cardiology": "cardiologista",
  "Urology": "urologista",
  "Neurology": "neurologista",
  "Dentist (General)": "dentista",
  "General Practice": "clinico-geral",
  "Pediatrics": "pediatra",
  "Physiotherapist": "fisioterapeuta",
  [INTEGRATIVE_THERAPY_SPECIALTY]: INTEGRATIVE_SEO_SLUG,
};

export function isPicsPracticeSlug(slug: string): boolean {
  return !!picBySlug(slug);
}

export function isIntegrativeSearchSlug(slug: string): boolean {
  return slug === INTEGRATIVE_SEO_SLUG || isPicsPracticeSlug(slug);
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function specialtyToSeoSlug(specialty: string): string {
  if (specialty === PSYCHOANALYSIS_SPECIALTY) return "psicanalista";
  if (specialty === INTEGRATIVE_THERAPY_SPECIALTY) return INTEGRATIVE_SEO_SLUG;
  const mapped = SPECIALTY_SEO_SLUG[specialty];
  if (mapped) return mapped;
  return slugify(getProfessionLabel("pt", specialty));
}

export function cityToSeoSlug(city: string | null | undefined): string {
  const trimmed = city?.trim();
  if (!trimmed) return "online";
  return slugify(trimmed);
}

export function citySlugToLabel(cidade: string): string {
  if (cidade === "online") return "Online";
  return cidade
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function seoSlugToSpecialtyLabel(
  especialidade: string,
  lang: Lang = "pt"
): string {
  if (especialidade === "psicanalista") return getProfessionLabel(lang, PSYCHOANALYSIS_SPECIALTY);
  if (especialidade === INTEGRATIVE_SEO_SLUG) {
    return getProfessionLabel(lang, INTEGRATIVE_THERAPY_SPECIALTY) || "Terapia integrativa";
  }
  const pic = picBySlug(especialidade);
  if (pic) return picLabel(pic, lang);
  const entry = Object.entries(SPECIALTY_SEO_SLUG).find(([, slug]) => slug === especialidade);
  if (entry) return getProfessionLabel(lang, entry[0]);
  return citySlugToLabel(especialidade);
}

export function buildPublicSearchPath(especialidade: string, cidade: string): string {
  return `/especialistas/${especialidade}/${cidade}`;
}

export function buildPublicSearchConvenioPath(
  especialidade: string,
  cidade: string,
  convenio: string
): string {
  return `/especialistas/${especialidade}/${cidade}/convenio/${convenio}`;
}

export function buildPublicSearchUrl(especialidade: string, cidade: string): string {
  return `${APP_BASE_URL}${buildPublicSearchPath(especialidade, cidade)}`;
}

export function buildPublicSearchConvenioUrl(
  especialidade: string,
  cidade: string,
  convenio: string
): string {
  return `${APP_BASE_URL}${buildPublicSearchConvenioPath(especialidade, cidade, convenio)}`;
}

export function buildProviderSlug(firstName: string, lastName: string): string {
  return slugify(`${firstName} ${lastName}`);
}

export function buildPublicProfilePath(card: {
  specialtySlug: string;
  citySlug: string;
  slug: string;
}): string {
  return `/especialistas/${card.specialtySlug}/${card.citySlug}/${card.slug}`;
}

export function buildPublicProfileUrl(card: {
  specialtySlug: string;
  citySlug: string;
  slug: string;
}): string {
  return `${APP_BASE_URL}${buildPublicProfilePath(card)}`;
}

export function buildEmbedAgendaPath(slug: string): string {
  return `/embed/agenda/${slug}`;
}

export function buildEmbedAgendaUrl(slug: string): string {
  return `${APP_BASE_URL}${buildEmbedAgendaPath(slug)}`;
}
