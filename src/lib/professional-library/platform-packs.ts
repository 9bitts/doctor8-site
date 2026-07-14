import type { LibraryPackDef } from "./types";

/** Curated Doctor8 packs — imported into the professional's library on demand. */
export const LIBRARY_PLATFORM_PACKS: LibraryPackDef[] = [
  {
    id: "pack-hipertensao",
    professionKeys: ["doctor", "nurse", "pharmacist"],
    titleKey: "libPack.hipertensao.title",
    descKey: "libPack.hipertensao.desc",
    category: "condition",
    cidPrefixes: ["I10", "I11", "I12", "I13", "I15"],
    items: [
      {
        titleKey: "libPack.hipertensao.item1.title",
        descKey: "libPack.hipertensao.item1.desc",
        url: "https://www.youtube.com/watch?v=9C_HReTsy18",
        contentType: "link",
        category: "condition",
      },
      {
        titleKey: "libPack.hipertensao.item2.title",
        contentKey: "libPack.hipertensao.item2.content",
        contentType: "text",
        category: "lifestyle",
      },
    ],
  },
  {
    id: "pack-diabetes",
    professionKeys: ["doctor", "nutritionist", "nurse"],
    titleKey: "libPack.diabetes.title",
    descKey: "libPack.diabetes.desc",
    category: "condition",
    cidPrefixes: ["E10", "E11", "E13", "E14"],
    items: [
      {
        titleKey: "libPack.diabetes.item1.title",
        descKey: "libPack.diabetes.item1.desc",
        url: "https://www.youtube.com/watch?v=UznW3zN9AYE",
        contentType: "link",
        category: "condition",
      },
      {
        titleKey: "libPack.diabetes.item2.title",
        contentKey: "libPack.diabetes.item2.content",
        contentType: "text",
        category: "nutrition",
      },
    ],
  },
  {
    id: "pack-ansiedade",
    professionKeys: ["psychologist", "doctor", "psychoanalyst"],
    titleKey: "libPack.ansiedade.title",
    descKey: "libPack.ansiedade.desc",
    category: "mental_health",
    cidPrefixes: ["F41"],
    items: [
      {
        titleKey: "libPack.ansiedade.item1.title",
        descKey: "libPack.ansiedade.item1.desc",
        url: "https://www.youtube.com/watch?v=30VMIyeaNQY",
        contentType: "link",
        category: "mental_health",
      },
      {
        titleKey: "libPack.ansiedade.item2.title",
        contentKey: "libPack.ansiedade.item2.content",
        contentType: "text",
        category: "mental_health",
      },
    ],
  },
  {
    id: "pack-sono",
    professionKeys: ["psychologist", "doctor", "nutritionist"],
    titleKey: "libPack.sono.title",
    descKey: "libPack.sono.desc",
    category: "lifestyle",
    cidPrefixes: ["G47", "F51"],
    items: [
      {
        titleKey: "libPack.sono.item1.title",
        contentKey: "libPack.sono.item1.content",
        contentType: "text",
        category: "lifestyle",
      },
    ],
  },
  {
    id: "pack-nutricao-basica",
    professionKeys: ["nutritionist", "doctor"],
    titleKey: "libPack.nutricao.title",
    descKey: "libPack.nutricao.desc",
    category: "nutrition",
    items: [
      {
        titleKey: "libPack.nutricao.item1.title",
        descKey: "libPack.nutricao.item1.desc",
        url: "https://www.youtube.com/watch?v=Gmh_xRSgXd0",
        contentType: "link",
        category: "nutrition",
      },
      {
        titleKey: "libPack.nutricao.item2.title",
        contentKey: "libPack.nutricao.item2.content",
        contentType: "text",
        category: "nutrition",
      },
    ],
  },
  {
    id: "pack-saude-bucal",
    professionKeys: ["dentist", "doctor"],
    titleKey: "libPack.bucal.title",
    descKey: "libPack.bucal.desc",
    category: "dental",
    items: [
      {
        titleKey: "libPack.bucal.item1.title",
        descKey: "libPack.bucal.item1.desc",
        url: "https://www.youtube.com/watch?v=3y4DxRwp3_8",
        contentType: "link",
        category: "dental",
      },
      {
        titleKey: "libPack.bucal.item2.title",
        contentKey: "libPack.bucal.item2.content",
        contentType: "text",
        category: "dental",
      },
    ],
  },
  {
    id: "pack-medicamentos",
    professionKeys: ["pharmacist", "doctor", "nurse"],
    titleKey: "libPack.medicamentos.title",
    descKey: "libPack.medicamentos.desc",
    category: "medication",
    items: [
      {
        titleKey: "libPack.medicamentos.item1.title",
        contentKey: "libPack.medicamentos.item1.content",
        contentType: "text",
        category: "medication",
      },
    ],
  },
  {
    id: "pack-psicanalise",
    professionKeys: ["psychoanalyst", "psychologist"],
    titleKey: "libPack.psicanalise.title",
    descKey: "libPack.psicanalise.desc",
    category: "mental_health",
    items: [
      {
        titleKey: "libPack.psicanalise.item1.title",
        descKey: "libPack.psicanalise.item1.desc",
        url: "https://www.youtube.com/watch?v=2OEL4P1RFG0",
        contentType: "link",
        category: "mental_health",
      },
      {
        titleKey: "libPack.psicanalise.item2.title",
        contentKey: "libPack.psicanalise.item2.content",
        contentType: "text",
        category: "mental_health",
      },
    ],
  },
  {
    id: "pack-integrativa",
    professionKeys: ["integrative_therapist", "doctor"],
    titleKey: "libPack.integrativa.title",
    descKey: "libPack.integrativa.desc",
    category: "integrative",
    items: [
      {
        titleKey: "libPack.integrativa.item1.title",
        descKey: "libPack.integrativa.item1.desc",
        contentKey: "libPack.integrativa.item1.content",
        contentType: "text",
        category: "integrative",
      },
    ],
  },
  {
    id: "pack-pos-consulta",
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
    titleKey: "libPack.posConsulta.title",
    descKey: "libPack.posConsulta.desc",
    category: "general",
    items: [
      {
        titleKey: "libPack.posConsulta.item1.title",
        contentKey: "libPack.posConsulta.item1.content",
        contentType: "text",
        category: "general",
      },
    ],
  },
];

export function packsForProfession(professionKey: import("./types").LibraryProfessionKey): LibraryPackDef[] {
  return LIBRARY_PLATFORM_PACKS.filter((p) => p.professionKeys.includes(professionKey));
}

export function findPackById(id: string): LibraryPackDef | undefined {
  return LIBRARY_PLATFORM_PACKS.find((p) => p.id === id);
}
