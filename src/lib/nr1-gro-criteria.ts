/** GRO criteria document — NR-1 subitem 1.5.7.3 (severity, probability, risk levels). */

export const GRO_SEVERITY_SCALE = [
  { level: 1, label: "Insignificante", description: "Lesão ou agravo sem afastamento, primeiros socorros" },
  { level: 2, label: "Leve", description: "Lesão com afastamento até 15 dias ou tratamento simples" },
  { level: 3, label: "Moderada", description: "Lesão com afastamento entre 16 e 30 dias ou sequelas reversíveis" },
  { level: 4, label: "Grave", description: "Lesão com afastamento superior a 30 dias ou incapacidade parcial" },
  { level: 5, label: "Crítica", description: "Morte, incapacidade permanente ou transtorno mental grave" },
] as const;

export const GRO_PROBABILITY_SCALE = [
  { level: 1, label: "Rara", description: "Improvável de ocorrer na vida útil da atividade" },
  { level: 2, label: "Baixa", description: "Pode ocorrer em situações excepcionais" },
  { level: 3, label: "Média", description: "Pode ocorrer em algum momento" },
  { level: 4, label: "Alta", description: "Provável de ocorrer com frequência" },
  { level: 5, label: "Muito alta", description: "Quase certo de ocorrer ou já ocorre rotineiramente" },
] as const;

export const GRO_RISK_MATRIX = [
  { minScore: 20, level: "CRITICAL", label: "Crítico", action: "Intervenção imediata — prioridade máxima no plano de ação" },
  { minScore: 15, level: "HIGH", label: "Alto", action: "Implementar medidas de controle em prazo definido" },
  { minScore: 9, level: "MEDIUM", label: "Médio", action: "Monitorar e planejar melhorias" },
  { minScore: 0, level: "LOW", label: "Baixo", action: "Manter controles existentes e revisar periodicamente" },
] as const;

export function buildGroCriteriaDocument(company: {
  razaoSocial: string;
  cnpj: string;
  nomeFantasia: string;
  grauRisco: number | null;
}) {
  return {
    generatedAt: new Date().toISOString(),
    docType: "GRO_CRITERIA",
    normReference: "NR-1 subitem 1.5.7.3 — Critérios adotados no GRO",
    company: {
      razaoSocial: company.razaoSocial,
      nomeFantasia: company.nomeFantasia,
      cnpj: company.cnpj,
      grauRisco: company.grauRisco,
    },
    methodology: {
      name: "Matriz de risco psicossocial Doctor8",
      description:
        "Avaliação baseada em severidade (impacto potencial na saúde) × probabilidade (frequência de exposição), conforme orientações do MTE para fatores psicossociais no PGR.",
      instruments: ["COPSOQ-lite", "HSE-IT (HSE Management Standards)", "Inventário qualitativo SST"],
      workerParticipation:
        "Pesquisas anônimas com grupo mínimo configurável; canal de denúncia; participação em AEP.",
    },
    severityScale: GRO_SEVERITY_SCALE,
    probabilityScale: GRO_PROBABILITY_SCALE,
    riskClassification: GRO_RISK_MATRIX,
    decisionCriteria: [
      "Riscos CRITICAL e HIGH entram obrigatoriamente no plano de ação com prazo e responsável.",
      "Riscos MEDIUM são monitorados e revisados a cada ciclo de pesquisa ou anualmente.",
      "Riscos LOW mantêm controles existentes documentados no inventário.",
      "Integração PGR ↔ PCMSO via checklist e encaminhamento EAP para colaboradores expostos.",
    ],
    reviewCycle: "Revisão anual ou quando houver mudança organizacional significativa (reestruturação, layoff, nova política de metas).",
    responsibleRoles: ["SST / Segurança do Trabalho", "RH", "Médico do Trabalho (PCMSO)", "Psicólogo organizacional (quando aplicável)"],
  };
}
