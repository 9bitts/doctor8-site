/** NR-1 psychosocial hazard catalog (MTE guia NR-01 revisado). */

export type Nr1HazardDefinition = {
  code: string;
  labelPt: string;
  possibleHarm: string;
  category: "organizacao" | "relacional" | "condicoes";
};

export const NR1_PSYCHOSOCIAL_HAZARDS: Nr1HazardDefinition[] = [
  {
    code: "ASSEDIO",
    labelPt: "Assédio de qualquer natureza no trabalho",
    possibleHarm: "Transtorno mental",
    category: "relacional",
  },
  {
    code: "MUDANCA_ORG",
    labelPt: "Má gestão de mudanças organizacionais",
    possibleHarm: "Transtorno mental; DORT",
    category: "organizacao",
  },
  {
    code: "PAPEL_INCERTO",
    labelPt: "Baixa clareza de papel/função",
    possibleHarm: "Transtorno mental",
    category: "organizacao",
  },
  {
    code: "BAIXO_RECONHECIMENTO",
    labelPt: "Baixas recompensas e reconhecimento",
    possibleHarm: "Transtorno mental",
    category: "organizacao",
  },
  {
    code: "FALTA_APOIO",
    labelPt: "Falta de suporte/apoio no trabalho",
    possibleHarm: "Transtorno mental",
    category: "relacional",
  },
  {
    code: "BAIXO_CONTROLE",
    labelPt: "Baixo controle no trabalho / falta de autonomia",
    possibleHarm: "Transtorno mental; DORT",
    category: "organizacao",
  },
  {
    code: "INJUSTICA",
    labelPt: "Baixa justiça organizacional",
    possibleHarm: "Transtorno mental",
    category: "organizacao",
  },
  {
    code: "EVENTO_TRAUMATICO",
    labelPt: "Eventos violentos ou traumáticos",
    possibleHarm: "Transtorno mental",
    category: "condicoes",
  },
  {
    code: "SUBCARGA",
    labelPt: "Baixa demanda no trabalho (subcarga)",
    possibleHarm: "Transtorno mental",
    category: "organizacao",
  },
  {
    code: "SOBRECARGA",
    labelPt: "Excesso de demandas no trabalho (sobrecarga)",
    possibleHarm: "Transtorno mental; DORT",
    category: "organizacao",
  },
  {
    code: "RELACIONAMENTO_RUIM",
    labelPt: "Más relacionamentos no local de trabalho",
    possibleHarm: "Transtorno mental",
    category: "relacional",
  },
  {
    code: "COMUNICACAO_DIFICIL",
    labelPt: "Trabalho em condições de difícil comunicação",
    possibleHarm: "Transtorno mental",
    category: "condicoes",
  },
  {
    code: "TRABALHO_REMOTO",
    labelPt: "Trabalho remoto e isolado",
    possibleHarm: "Transtorno mental; Fadiga",
    category: "condicoes",
  },
];

export function getNr1HazardByCode(code: string): Nr1HazardDefinition | undefined {
  return NR1_PSYCHOSOCIAL_HAZARDS.find((h) => h.code === code);
}
