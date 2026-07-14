import type { PrescriptionItemKind } from "@/lib/prescription-item-kind";
import type { IntegrativeProtocolAdd } from "./protocols";

export type ProtocolPresetItem =
  | {
      kind: "mn";
      mnSlug: string;
      itemKind: PrescriptionItemKind;
      dosage?: string;
      frequency?: string;
      duration?: string;
    }
  | {
      kind: "floral";
      floralProductId: string;
      dosage?: string;
      frequency?: string;
      duration?: string;
    };

export type IntegrativeProtocolPreset = {
  id: string;
  add: IntegrativeProtocolAdd;
  items: ProtocolPresetItem[];
  instructions?: string;
  validDays?: number;
};

export const INTEGRATIVE_PROTOCOL_PRESETS: Record<string, IntegrativeProtocolPreset> = {
  sono: {
    id: "sono",
    add: "phytotherapy",
    items: [
      {
        kind: "mn",
        mnSlug: "fitoterapico-valeriana-officinalis-l",
        itemKind: "phytotherapy",
        dosage: "Extrato seco 300mg",
        frequency: "1 cápsula à noite",
        duration: "30 dias",
      },
      {
        kind: "mn",
        mnSlug: "fitoterapico-matricaria-chamomilla-l",
        itemKind: "phytotherapy",
        dosage: "Chá ou extrato",
        frequency: "1x à noite",
        duration: "30 dias",
      },
    ],
    instructions: "Revisar monografias MFFB/FFFB. Evitar associação com sedativos sem supervisão.",
    validDays: 30,
  },
  ansiedade: {
    id: "ansiedade",
    add: "floral",
    items: [
      {
        kind: "floral",
        floralProductId: "sgf_anti_estresse",
        dosage: "4 gotas, 4x/dia",
        duration: "30 dias",
      },
      {
        kind: "floral",
        floralProductId: "bach_rescue",
        dosage: "4 gotas sob a língua",
        frequency: "Quando necessário",
        duration: "14 dias",
      },
    ],
    instructions: "Foque no quadro emocional atual. Florais não substituem tratamento psiquiátrico quando indicado.",
    validDays: 30,
  },
  imunidade: {
    id: "imunidade",
    add: "apitherapy",
    items: [
      {
        kind: "mn",
        mnSlug: "propolis",
        itemKind: "apitherapy",
        dosage: "Extrato 20–30%",
        frequency: "10–20 gotas diluídas em água, 2x/dia",
        duration: "30 dias",
      },
      {
        kind: "mn",
        mnSlug: "mel",
        itemKind: "apitherapy",
        dosage: "1 colher de chá",
        frequency: "1–2x/dia",
        duration: "30 dias",
      },
    ],
    instructions: "Confirmar ausência de alergia a produtos apícolas antes de prescrever.",
    validDays: 30,
  },
  estresse: {
    id: "estresse",
    add: "homeopathy",
    items: [
      {
        kind: "mn",
        mnSlug: "ignatia_amara",
        itemKind: "homeopathy",
        dosage: "30CH",
        frequency: "3–5 glóbulos, 3x/dia",
        duration: "21 dias",
      },
      {
        kind: "mn",
        mnSlug: "nux_vomica",
        itemKind: "homeopathy",
        dosage: "30CH",
        frequency: "1 dose à noite",
        duration: "7 dias",
      },
    ],
    instructions: "Tomar 30 min antes/depois das refeições. Evitar canforados e mentol forte.",
    validDays: 30,
  },
  "aroma-casa": {
    id: "aroma-casa",
    add: "aromatherapy",
    items: [
      {
        kind: "mn",
        mnSlug: "lavanda",
        itemKind: "aromatherapy",
        dosage: "2 gotas no difusor",
        frequency: "30 min à noite",
        duration: "30 dias",
      },
      {
        kind: "mn",
        mnSlug: "bergamota",
        itemKind: "aromatherapy",
        dosage: "Diluir 1:10 em óleo carreador",
        frequency: "Aplicação tópica pontual",
        duration: "14 dias",
      },
    ],
    instructions: "Não ingerir óleos essenciais. Fotossensibilidade com bergamota — evitar sol após uso tópico.",
    validDays: 30,
  },
};

export function getIntegrativeProtocolPreset(id: string): IntegrativeProtocolPreset | undefined {
  return INTEGRATIVE_PROTOCOL_PRESETS[id];
}
