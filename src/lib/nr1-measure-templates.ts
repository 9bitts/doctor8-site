/** Preventive measure templates for NR-1 action plans (psychosocial + ergonomic PME). */

export type Nr1MeasureTemplate = {
  id: string;
  category: "organizacao" | "lideranca" | "comunicacao" | "promocao" | "ergonomia" | "vigilancia";
  label: string;
  measureDescription: string;
  hazardCodes: string[];
};

export const NR1_MEASURE_TEMPLATES: Nr1MeasureTemplate[] = [
  {
    id: "metas_compativeis",
    category: "organizacao",
    label: "Metas compatíveis com capacidade operacional",
    measureDescription:
      "Revisar metas de produtividade para alinhá-las à capacidade operacional da equipe; eliminar metas abusivas e documentar critérios de cobrança.",
    hazardCodes: ["SOBRECARGA", "BAIXO_CONTROLE", "INJUSTICA"],
  },
  {
    id: "pausas_jornada",
    category: "organizacao",
    label: "Pausas regulares e jornada adequada",
    measureDescription:
      "Garantir pausas regulares e evitar jornadas excessivas; formalizar política de desconexão e equilíbrio vida pessoal/profissional.",
    hazardCodes: ["SOBRECARGA", "TRABALHO_REMOTO"],
  },
  {
    id: "clareza_papel",
    category: "organizacao",
    label: "Clareza de funções e papéis",
    measureDescription:
      "Publicar descrições de função atualizadas e comunicar responsabilidades; reduzir ambiguidade de papel nas equipes críticas.",
    hazardCodes: ["PAPEL_INCERTO", "MUDANCA_ORG"],
  },
  {
    id: "capacitacao_lideranca",
    category: "lideranca",
    label: "Capacitação de lideranças (comunicação respeitosa)",
    measureDescription:
      "Capacitar supervisores em comunicação respeitosa, feedback construtivo e prevenção de assédio; proibir gestão por medo.",
    hazardCodes: ["ASSEDIO", "FALTA_APOIO", "RELACIONAMENTO_RUIM", "INJUSTICA"],
  },
  {
    id: "prevencao_assedio",
    category: "lideranca",
    label: "Política e canal de prevenção ao assédio",
    measureDescription:
      "Divulgar política de prevenção ao assédio, canal seguro de denúncia com sigilo e fluxo de apuração documentado.",
    hazardCodes: ["ASSEDIO", "EVENTO_TRAUMATICO", "RELACIONAMENTO_RUIM"],
  },
  {
    id: "canais_escuta",
    category: "comunicacao",
    label: "Canais seguros de escuta",
    measureDescription:
      "Manter canais seguros de escuta (pesquisa anônima + denúncia) e divulgar orientações sobre saúde mental no trabalho.",
    hazardCodes: ["COMUNICACAO_DIFICIL", "FALTA_APOIO", "ASSEDIO"],
  },
  {
    id: "campanhas_saude_mental",
    category: "promocao",
    label: "Campanhas de promoção da saúde mental",
    measureDescription:
      "Realizar campanhas educativas de saúde mental, incentivar hábitos saudáveis e comunicar benefício EAP com garantia de sigilo.",
    hazardCodes: ["SOBRECARGA", "FALTA_APOIO", "TRABALHO_REMOTO"],
  },
  {
    id: "micropausas_ergonomia",
    category: "ergonomia",
    label: "Micropausas e rodízio de tarefas",
    measureDescription:
      "Introduzir micropausas de 3–5 minutos a cada 50–60 minutos e rodízio entre tarefas repetitivas e menos repetitivas.",
    hazardCodes: ["SOBRECARGA", "BAIXO_CONTROLE"],
  },
  {
    id: "ajuste_posto",
    category: "ergonomia",
    label: "Ajuste simples de posto (altura/alcance)",
    measureDescription:
      "Ajustar altura de bancada/cadeira, aproximar materiais da zona de alcance e reduzir elevação de ombros; priorizar mobiliário regulável.",
    hazardCodes: ["SOBRECARGA"],
  },
  {
    id: "auxilio_cargas",
    category: "ergonomia",
    label: "Auxílio mecânico / fracionamento de cargas",
    measureDescription:
      "Disponibilizar carrinhos/paleteiras, fracionar volumes >25 kg e orientar levantamento com carga próxima ao corpo e sem torção.",
    hazardCodes: ["SOBRECARGA"],
  },
  {
    id: "vigilancia_absenteismo",
    category: "vigilancia",
    label: "Vigilância de absenteísmo e queixas",
    measureDescription:
      "Monitorar aumento de absenteísmo, rotatividade, queixas somáticas e queda coletiva de produtividade; reavaliar organização do trabalho.",
    hazardCodes: ["SOBRECARGA", "ASSEDIO", "FALTA_APOIO"],
  },
];

export function getMeasureTemplate(id: string): Nr1MeasureTemplate | undefined {
  return NR1_MEASURE_TEMPLATES.find((t) => t.id === id);
}

export function measureTemplatesForHazard(hazardCode: string): Nr1MeasureTemplate[] {
  return NR1_MEASURE_TEMPLATES.filter((t) => t.hazardCodes.includes(hazardCode));
}
