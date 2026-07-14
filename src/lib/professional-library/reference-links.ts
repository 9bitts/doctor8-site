import { PROFESSIONAL_INTEGRATIVE_HUB } from "@/lib/integrative-medicine/professional-routes";
import type { LibraryProfessionKey, LibraryReferenceDef } from "./types";

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
    href: "/psychologist/psychology",
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
    href: "/nutricionista/nutrition",
    icon: "utensils",
  },
  {
    id: "ref-enfermagem",
    professionKeys: ["nurse"],
    titleKey: "libRef.enfermagem.title",
    descKey: "libRef.enfermagem.desc",
    href: "/enfermeiro/nursing",
    icon: "heart",
  },
  {
    id: "ref-farmacia",
    professionKeys: ["pharmacist"],
    titleKey: "libRef.farmacia.title",
    descKey: "libRef.farmacia.desc",
    href: "/farmaceutico/pharmacy",
    icon: "pill",
  },
  {
    id: "ref-odontologia",
    professionKeys: ["dentist"],
    titleKey: "libRef.odontologia.title",
    descKey: "libRef.odontologia.desc",
    href: "/odontologo/dentistry",
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
