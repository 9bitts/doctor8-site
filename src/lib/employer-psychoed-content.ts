/** Trilhas psicoeducativas corporativas — inspiradas em programas EAP de mercado (Zenklub, etc.). */

export type PsychoedContent = {
  id: string;
  title: string;
  summary: string;
  durationMins: number;
  format: "audio" | "text" | "exercise";
  hazardCodes: string[];
  dimensions: string[];
};

export const PSYCHOED_TRAILS: PsychoedContent[] = [
  {
    id: "trail-sobrecarga-1",
    title: "Reconhecendo a sobrecarga no trabalho",
    summary: "Sinais de excesso de demandas e estratégias de priorização sem culpa.",
    durationMins: 8,
    format: "text",
    hazardCodes: ["SOBRECARGA"],
    dimensions: ["Demandas"],
  },
  {
    id: "trail-sobrecarga-2",
    title: "Pausas estratégicas durante o dia",
    summary: "Micro-pausas baseadas em evidências para reduzir exaustão cognitiva.",
    durationMins: 5,
    format: "exercise",
    hazardCodes: ["SOBRECARGA", "SUBCARGA"],
    dimensions: ["Demandas"],
  },
  {
    id: "trail-controle-1",
    title: "Autonomia e controle no dia a dia",
    summary: "Como negociar prioridades com a liderança de forma assertiva.",
    durationMins: 10,
    format: "text",
    hazardCodes: ["BAIXO_CONTROLE"],
    dimensions: ["Controle"],
  },
  {
    id: "trail-apoio-1",
    title: "Pedir ajuda no ambiente de trabalho",
    summary: "Reduzir o estigma de vulnerabilidade e fortalecer redes de apoio.",
    durationMins: 7,
    format: "audio",
    hazardCodes: ["FALTA_APOIO"],
    dimensions: ["Apoio", "Apoio da liderança"],
  },
  {
    id: "trail-assedio-1",
    title: "Canal de denúncia e seus direitos",
    summary: "Como usar o canal anônimo da empresa e o que esperar do processo.",
    durationMins: 6,
    format: "text",
    hazardCodes: ["ASSEDIO", "RELACIONAMENTO_RUIM"],
    dimensions: ["Relacionamentos"],
  },
  {
    id: "trail-reconhecimento-1",
    title: "Valorização e motivação intrínseca",
    summary: "Técnicas para manter engajamento quando o reconhecimento formal é limitado.",
    durationMins: 9,
    format: "text",
    hazardCodes: ["BAIXO_RECONHECIMENTO"],
    dimensions: ["Reconhecimento"],
  },
  {
    id: "trail-remoto-1",
    title: "Desconexão digital após o expediente",
    summary: "Limites saudáveis em home office e trabalho híbrido.",
    durationMins: 8,
    format: "exercise",
    hazardCodes: ["TRABALHO_REMOTO"],
    dimensions: ["Trabalho remoto"],
  },
  {
    id: "trail-ansiedade-1",
    title: "Respiração diafragmática para momentos de pressão",
    summary: "Exercício guiado de 4-7-8 para reduzir ativação do estresse.",
    durationMins: 4,
    format: "exercise",
    hazardCodes: ["SOBRECARGA", "BAIXO_CONTROLE"],
    dimensions: ["Demandas", "Controle"],
  },
  {
    id: "trail-papel-1",
    title: "Clareza de papel e expectativas",
    summary: "Como alinhar responsabilidades com seu gestor em reuniões 1:1.",
    durationMins: 7,
    format: "text",
    hazardCodes: ["PAPEL_INCERTO"],
    dimensions: ["Papel", "Clareza de papel"],
  },
  {
    id: "trail-mudanca-1",
    title: "Adaptação a mudanças organizacionais",
    summary: "Estratégias de coping em reestruturações e novas políticas.",
    durationMins: 10,
    format: "text",
    hazardCodes: ["MUDANCA_ORG"],
    dimensions: ["Mudanças"],
  },
];

export function recommendContentForHazards(hazardCodes: string[], limit = 4): PsychoedContent[] {
  const set = new Set(hazardCodes);
  const scored = PSYCHOED_TRAILS.map((item) => ({
    item,
    score: item.hazardCodes.filter((c) => set.has(c)).length,
  }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) return scored.slice(0, limit).map((s) => s.item);
  return PSYCHOED_TRAILS.slice(0, limit);
}

export function getContentById(id: string): PsychoedContent | undefined {
  return PSYCHOED_TRAILS.find((c) => c.id === id);
}
