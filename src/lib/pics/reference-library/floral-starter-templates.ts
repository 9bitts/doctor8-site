/** Built-in floral prescription starters — quick-apply from Terapia de Florais hub. */

import type { Lang } from "@/lib/i18n/translations";
import { translate } from "@/lib/i18n/translations";
import { floralProductByValue } from "./floral-products";

export interface FloralStarterMedItem {
  floralProductId: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  pharmaceuticalForm?: string;
}

export interface FloralStarterTemplate {
  id: string;
  nameKey: string;
  instructionsKey: string;
  validDays: number;
  medications: FloralStarterMedItem[];
}

const FLORAL_DEFAULT_DOSAGE = "4 gotas, 4x/dia";
const FLORAL_DEFAULT_FORM = "gotas_30ml";
const FLORAL_DEFAULT_DURATION = "30 dias";

export const FLORAL_STARTER_TEMPLATES: FloralStarterTemplate[] = [
  {
    id: "starter_rescue",
    nameKey: "it.tmpl.floral.rescue",
    instructionsKey: "it.tmpl.floral.rescueInstr",
    validDays: 14,
    medications: [
      { floralProductId: "bach_rescue", dosage: "4 gotas sob a língua", frequency: "As needed", pharmaceuticalForm: FLORAL_DEFAULT_FORM },
    ],
  },
  {
    id: "starter_bom_sono",
    nameKey: "it.tmpl.floral.bomSono",
    instructionsKey: "it.tmpl.floral.bomSonoInstr",
    validDays: 30,
    medications: [
      { floralProductId: "sgf_bom_sono", dosage: FLORAL_DEFAULT_DOSAGE, frequency: "Four times daily", pharmaceuticalForm: FLORAL_DEFAULT_FORM, duration: FLORAL_DEFAULT_DURATION },
    ],
  },
  {
    id: "starter_anti_estresse",
    nameKey: "it.tmpl.floral.antiEstresse",
    instructionsKey: "it.tmpl.floral.antiEstresseInstr",
    validDays: 30,
    medications: [
      { floralProductId: "sgf_anti_estresse", dosage: FLORAL_DEFAULT_DOSAGE, frequency: "Four times daily", pharmaceuticalForm: FLORAL_DEFAULT_FORM, duration: FLORAL_DEFAULT_DURATION },
    ],
  },
  {
    id: "starter_ansiedade",
    nameKey: "it.tmpl.floral.ansiedade",
    instructionsKey: "it.tmpl.floral.ansiedadeInstr",
    validDays: 30,
    medications: [
      { floralProductId: "sgf_ansiedade", dosage: FLORAL_DEFAULT_DOSAGE, frequency: "Four times daily", pharmaceuticalForm: FLORAL_DEFAULT_FORM, duration: FLORAL_DEFAULT_DURATION },
    ],
  },
  {
    id: "starter_panicum",
    nameKey: "it.tmpl.floral.panicum",
    instructionsKey: "it.tmpl.floral.panicumInstr",
    validDays: 30,
    medications: [
      { floralProductId: "sgf_panicum", dosage: FLORAL_DEFAULT_DOSAGE, frequency: "Four times daily", pharmaceuticalForm: FLORAL_DEFAULT_FORM, duration: FLORAL_DEFAULT_DURATION },
    ],
  },
  {
    id: "starter_protecao",
    nameKey: "it.tmpl.floral.protecao",
    instructionsKey: "it.tmpl.floral.protecaoInstr",
    validDays: 30,
    medications: [
      { floralProductId: "sgf_protecao", dosage: FLORAL_DEFAULT_DOSAGE, frequency: "Four times daily", pharmaceuticalForm: FLORAL_DEFAULT_FORM, duration: FLORAL_DEFAULT_DURATION },
    ],
  },
  {
    id: "starter_emergencial",
    nameKey: "it.tmpl.floral.emergencial",
    instructionsKey: "it.tmpl.floral.emergencialInstr",
    validDays: 14,
    medications: [
      { floralProductId: "sgf_emergencial", dosage: "4 gotas, a cada 15–30 min se necessário", frequency: "As needed", pharmaceuticalForm: FLORAL_DEFAULT_FORM },
    ],
  },
  {
    id: "starter_estudante",
    nameKey: "it.tmpl.floral.estudante",
    instructionsKey: "it.tmpl.floral.estudanteInstr",
    validDays: 60,
    medications: [
      { floralProductId: "sgf_estudante", dosage: FLORAL_DEFAULT_DOSAGE, frequency: "Four times daily", pharmaceuticalForm: FLORAL_DEFAULT_FORM, duration: "60 dias" },
    ],
  },
  {
    id: "starter_bach_medo",
    nameKey: "it.tmpl.floral.bachMedo",
    instructionsKey: "it.tmpl.floral.bachMedoInstr",
    validDays: 30,
    medications: [
      { floralProductId: "bach_mimulus", dosage: FLORAL_DEFAULT_DOSAGE, frequency: "Four times daily", pharmaceuticalForm: FLORAL_DEFAULT_FORM },
      { floralProductId: "bach_aspen", dosage: FLORAL_DEFAULT_DOSAGE, frequency: "Four times daily", pharmaceuticalForm: FLORAL_DEFAULT_FORM },
    ],
  },
  {
    id: "starter_bach_mente",
    nameKey: "it.tmpl.floral.bachMente",
    instructionsKey: "it.tmpl.floral.bachMenteInstr",
    validDays: 30,
    medications: [
      { floralProductId: "bach_white_chestnut", dosage: FLORAL_DEFAULT_DOSAGE, frequency: "Four times daily", pharmaceuticalForm: FLORAL_DEFAULT_FORM },
      { floralProductId: "bach_clematis", dosage: FLORAL_DEFAULT_DOSAGE, frequency: "Four times daily", pharmaceuticalForm: FLORAL_DEFAULT_FORM },
    ],
  },
  {
    id: "starter_dislexia",
    nameKey: "it.tmpl.floral.dislexia",
    instructionsKey: "it.tmpl.floral.dislexiaInstr",
    validDays: 60,
    medications: [
      { floralProductId: "sg_margarida", dosage: FLORAL_DEFAULT_DOSAGE, frequency: "Four times daily", pharmaceuticalForm: FLORAL_DEFAULT_FORM },
      { floralProductId: "sg_abrico", dosage: FLORAL_DEFAULT_DOSAGE, frequency: "Four times daily", pharmaceuticalForm: FLORAL_DEFAULT_FORM },
      { floralProductId: "sg_geranio", dosage: FLORAL_DEFAULT_DOSAGE, frequency: "Four times daily", pharmaceuticalForm: FLORAL_DEFAULT_FORM },
      { floralProductId: "sg_sapientum", dosage: FLORAL_DEFAULT_DOSAGE, frequency: "Four times daily", pharmaceuticalForm: FLORAL_DEFAULT_FORM },
      { floralProductId: "sg_arnica_silvestre", dosage: FLORAL_DEFAULT_DOSAGE, frequency: "Four times daily", pharmaceuticalForm: FLORAL_DEFAULT_FORM },
    ],
  },
];

export function floralStarterById(id: string) {
  return FLORAL_STARTER_TEMPLATES.find((t) => t.id === id);
}

export function isFloralMedItem(item: { itemKind?: string }): boolean {
  return item.itemKind === "floral";
}

export function isFloralTemplate(medications: { itemKind?: string }[]): boolean {
  return medications.length > 0 && medications.every((m) => isFloralMedItem(m) || m.itemKind === undefined && false);
}

/** True if every item is floral or phytotherapy-only template check for floral */
export function templateHasFloralItems(medications: { itemKind?: string }[]): boolean {
  return medications.some((m) => m.itemKind === "floral");
}

export interface ResolvedFloralTemplate {
  name: string;
  instructions: string;
  validDays: number;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
    pharmaceuticalForm: string;
    itemKind: "floral";
    floralProductId: string;
  }[];
}

export function resolveFloralStarter(starterId: string, lang: Lang): ResolvedFloralTemplate | null {
  const starter = floralStarterById(starterId);
  if (!starter) return null;
  const t = (key: string) => translate(lang, key);
  return {
    name: t(starter.nameKey),
    instructions: t(starter.instructionsKey),
    validDays: starter.validDays,
    medications: starter.medications.map((m) => {
      const product = floralProductByValue(m.floralProductId);
      return {
        name: product ? t(product.labelKey) : m.floralProductId,
        dosage: m.dosage || "",
        frequency: m.frequency || "",
        duration: m.duration || "",
        instructions: m.instructions || "",
        pharmaceuticalForm: m.pharmaceuticalForm || "gotas_30ml",
        itemKind: "floral" as const,
        floralProductId: m.floralProductId,
      };
    }),
  };
}
