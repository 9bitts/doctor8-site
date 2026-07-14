import { PROFESSIONAL_INTEGRATIVE_HUB } from "@/lib/integrative-medicine/professional-routes";
import type { LibraryProfessionKey, LibraryReferenceDef } from "./types";

const INTEGRATIVE_THERAPIST_HUB = "/integrative-therapist/medicina-natural";

const RESEARCH_HREF: Partial<Record<LibraryProfessionKey, string>> = {
  doctor: "/professional/research",
  psychologist: "/psychologist/research",
  nutritionist: "/nutricionista/research",
  nurse: "/enfermeiro/research",
  pharmacist: "/farmaceutico/research",
  dentist: "/odontologo/research",
  psychoanalyst: "/psychoanalyst/research",
  integrative_therapist: "/integrative-therapist/research",
};

const PRESCRIPTION_HREF: Partial<Record<LibraryProfessionKey, string>> = {
  doctor: "/professional/prescriptions",
  nurse: "/enfermeiro/prescricao",
  dentist: "/odontologo/prescriptions",
};

/** Internal clinical reference shortcuts — personalized by profession. */
export const LIBRARY_REFERENCE_LINKS: LibraryReferenceDef[] = [
  {
    id: "ref-integrativa",
    professionKeys: ["doctor", "integrative_therapist"],
    titleKey: "libRef.integrativa.title",
    descKey: "libRef.integrativa.desc",
    href: PROFESSIONAL_INTEGRATIVE_HUB,
    icon: "leaf",
  },
  {
    id: "ref-florais",
    professionKeys: ["doctor", "integrative_therapist"],
    titleKey: "libRef.florais.title",
    descKey: "libRef.florais.desc",
    href: `${PROFESSIONAL_INTEGRATIVE_HUB}/terapia-florais/catalogo`,
    icon: "flower",
  },
  {
    id: "ref-fitoterapia",
    professionKeys: ["doctor", "integrative_therapist", "pharmacist"],
    titleKey: "libRef.fitoterapia.title",
    descKey: "libRef.fitoterapia.desc",
    href: `${PROFESSIONAL_INTEGRATIVE_HUB}/fitoterapia/catalogo`,
    icon: "leaf",
  },
  {
    id: "ref-freud",
    professionKeys: ["psychoanalyst"],
    titleKey: "libRef.freud.title",
    descKey: "libRef.freud.desc",
    href: "/psychoanalyst/freud",
    icon: "brain",
  },
  {
    id: "ref-psicologia",
    professionKeys: ["psychologist"],
    titleKey: "libRef.psicologia.title",
    descKey: "libRef.psicologia.desc",
    href: "/psychologist/sessions",
    icon: "brain",
  },
  {
    id: "ref-prescricoes",
    professionKeys: ["doctor", "dentist", "nurse"],
    titleKey: "libRef.prescricoes.title",
    descKey: "libRef.prescricoes.desc",
    href: "/professional/prescriptions",
    icon: "pill",
  },
  {
    id: "ref-nutricao",
    professionKeys: ["nutritionist"],
    titleKey: "libRef.nutricao.title",
    descKey: "libRef.nutricao.desc",
    href: "/nutricionista/planos",
    icon: "utensils",
  },
  {
    id: "ref-enfermagem",
    professionKeys: ["nurse"],
    titleKey: "libRef.enfermagem.title",
    descKey: "libRef.enfermagem.desc",
    href: "/enfermeiro/sae",
    icon: "heart",
  },
  {
    id: "ref-farmacia",
    professionKeys: ["pharmacist"],
    titleKey: "libRef.farmacia.title",
    descKey: "libRef.farmacia.desc",
    href: "/farmaceutico/educacao",
    icon: "pill",
  },
  {
    id: "ref-odontologia",
    professionKeys: ["dentist"],
    titleKey: "libRef.odontologia.title",
    descKey: "libRef.odontologia.desc",
    href: "/odontologo/anamnese",
    icon: "stethoscope",
  },
  {
    id: "ref-ms-saude",
    professionKeys: ["doctor", "nurse", "nutritionist", "psychologist", "dentist", "pharmacist"],
    titleKey: "libRef.ms.title",
    descKey: "libRef.ms.desc",
    href: "https://www.gov.br/saude/pt-br",
    external: true,
    icon: "book",
  },
  {
    id: "ref-pesquisa",
    professionKeys: [
      "doctor",
      "psychologist",
      "nutritionist",
      "nurse",
      "pharmacist",
      "dentist",
      "psychoanalyst",
      "integrative_therapist",
    ],
    titleKey: "libRef.pesquisa.title",
    descKey: "libRef.pesquisa.desc",
    href: "/professional/research",
    icon: "microscope",
  },
];

export function referencesForProfession(professionKey: LibraryProfessionKey): LibraryReferenceDef[] {
  return LIBRARY_REFERENCE_LINKS.filter((r) => r.professionKeys.includes(professionKey));
}

/** Resolve portal-correct href for a reference link. */
export function resolveReferenceHref(ref: LibraryReferenceDef, professionKey: LibraryProfessionKey): string {
  if (ref.external) return ref.href;

  if (ref.id === "ref-pesquisa") {
    return RESEARCH_HREF[professionKey] ?? ref.href;
  }

  if (ref.id === "ref-prescricoes") {
    return PRESCRIPTION_HREF[professionKey] ?? ref.href;
  }

  if (professionKey === "integrative_therapist") {
    if (ref.href.startsWith(PROFESSIONAL_INTEGRATIVE_HUB)) {
      return ref.href.replace(PROFESSIONAL_INTEGRATIVE_HUB, INTEGRATIVE_THERAPIST_HUB);
    }
    if (ref.id === "ref-fitoterapia") {
      return `${INTEGRATIVE_THERAPIST_HUB}/fitoterapia/catalogo`;
    }
  }

  if (professionKey === "pharmacist" && ref.id === "ref-fitoterapia") {
    return "/farmaceutico/educacao";
  }

  return ref.href;
}
