// Client-safe SEO slug helpers (no server/db imports).

import { getProfessionLabel, PSYCHOANALYSIS_SPECIALTY } from "@/lib/professions";

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
};

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
  lang: "pt" | "en" | "es" = "pt"
): string {
  if (especialidade === "psicanalista") return getProfessionLabel(lang, PSYCHOANALYSIS_SPECIALTY);
  const entry = Object.entries(SPECIALTY_SEO_SLUG).find(([, slug]) => slug === especialidade);
  if (entry) return getProfessionLabel(lang, entry[0]);
  return citySlugToLabel(especialidade);
}

export function buildPublicSearchPath(especialidade: string, cidade: string): string {
  return `/especialistas/${especialidade}/${cidade}`;
}

export function buildPublicSearchUrl(especialidade: string, cidade: string): string {
  return `${APP_BASE_URL}${buildPublicSearchPath(especialidade, cidade)}`;
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
