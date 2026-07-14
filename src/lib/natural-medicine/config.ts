/** Natural medicine (PICS naturalistas) — hub modules for Doctor8 dashboards. */

export type NaturalMedicinePortal = "professional" | "integrative";

export type NaturalMedicinePracticeId =
  | "fitoterapia"
  | "terapia_florais"
  | "aromaterapia"
  | "homeopatia"
  | "apiterapia"
  | "cannabis";

export interface NaturalMedicinePracticeConfig {
  id: NaturalMedicinePracticeId;
  /** URL segment under /medicina-natural/ */
  urlSlug: string;
  /** PICS slug in consult templates & reference library */
  practiceSlug: string;
  hubTitleKey: string;
  hubSubtitleKey: string;
  bannerKey: string;
  cardDescKey: string;
  /** Tailwind badge colors for hub cards */
  color: string;
  icon: "Leaf" | "Flower2" | "Wind" | "Droplets" | "Hexagon" | "Sprout";
  /** Visible only to physicians and dentists (RDC 1.015/2026) */
  requiresCannabisPrescriber?: boolean;
}

export const NATURAL_MEDICINE_PRACTICES: NaturalMedicinePracticeConfig[] = [
  {
    id: "fitoterapia",
    urlSlug: "fitoterapia",
    practiceSlug: "fitoterapia",
    hubTitleKey: "nm.practice.fitoterapia.title",
    hubSubtitleKey: "nm.practice.fitoterapia.subtitle",
    bannerKey: "nm.practice.fitoterapia.banner",
    cardDescKey: "nm.practice.fitoterapia.cardDesc",
    color: "bg-teal-100 text-teal-600",
    icon: "Leaf",
  },
  {
    id: "terapia_florais",
    urlSlug: "terapia-florais",
    practiceSlug: "terapia_florais",
    hubTitleKey: "nm.practice.florais.title",
    hubSubtitleKey: "nm.practice.florais.subtitle",
    bannerKey: "nm.practice.florais.banner",
    cardDescKey: "nm.practice.florais.cardDesc",
    color: "bg-pink-100 text-pink-600",
    icon: "Flower2",
  },
  {
    id: "aromaterapia",
    urlSlug: "aromaterapia",
    practiceSlug: "aromaterapia",
    hubTitleKey: "nm.practice.aroma.title",
    hubSubtitleKey: "nm.practice.aroma.subtitle",
    bannerKey: "nm.practice.aroma.banner",
    cardDescKey: "nm.practice.aroma.cardDesc",
    color: "bg-violet-100 text-violet-600",
    icon: "Wind",
  },
  {
    id: "homeopatia",
    urlSlug: "homeopatia",
    practiceSlug: "homeopatia",
    hubTitleKey: "nm.practice.homeo.title",
    hubSubtitleKey: "nm.practice.homeo.subtitle",
    bannerKey: "nm.practice.homeo.banner",
    cardDescKey: "nm.practice.homeo.cardDesc",
    color: "bg-sky-100 text-sky-600",
    icon: "Droplets",
  },
  {
    id: "apiterapia",
    urlSlug: "apiterapia",
    practiceSlug: "apiterapia",
    hubTitleKey: "nm.practice.api.title",
    hubSubtitleKey: "nm.practice.api.subtitle",
    bannerKey: "nm.practice.api.banner",
    cardDescKey: "nm.practice.api.cardDesc",
    color: "bg-amber-100 text-amber-700",
    icon: "Hexagon",
  },
  {
    id: "cannabis",
    urlSlug: "cannabis",
    practiceSlug: "cannabis",
    hubTitleKey: "nm.practice.cannabis.title",
    hubSubtitleKey: "nm.practice.cannabis.subtitle",
    bannerKey: "nm.practice.cannabis.banner",
    cardDescKey: "nm.practice.cannabis.cardDesc",
    color: "bg-lime-100 text-lime-800",
    icon: "Sprout",
    requiresCannabisPrescriber: true,
  },
];

export const NATURAL_MEDICINE_PRACTICE_SLUGS = NATURAL_MEDICINE_PRACTICES.map(
  (p) => p.practiceSlug,
);

export function naturalMedicineByUrlSlug(
  urlSlug: string,
): NaturalMedicinePracticeConfig | undefined {
  return NATURAL_MEDICINE_PRACTICES.find((p) => p.urlSlug === urlSlug);
}

export function naturalMedicineByPracticeSlug(
  practiceSlug: string,
): NaturalMedicinePracticeConfig | undefined {
  return NATURAL_MEDICINE_PRACTICES.find((p) => p.practiceSlug === practiceSlug);
}

export function naturalMedicineBasePath(portal: NaturalMedicinePortal): string {
  return portal === "professional"
    ? "/professional/medicina-natural"
    : "/integrative-therapist/medicina-natural";
}

export function hasAnyNaturalMedicinePractice(
  picsPractices: string[],
): boolean {
  return NATURAL_MEDICINE_PRACTICE_SLUGS.some((slug) =>
    picsPractices.includes(slug),
  );
}

export function filterEnabledNaturalPractices(
  picsPractices: string[],
): NaturalMedicinePracticeConfig[] {
  if (picsPractices.length === 0) return [];
  return NATURAL_MEDICINE_PRACTICES.filter((p) =>
    picsPractices.includes(p.practiceSlug),
  );
}
