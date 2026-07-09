import type { ComplianceNextStep } from "./types";

export const complianceNextSteps: ComplianceNextStep[] = [
  {
    priority: 1,
    title: "Unificar canal do DPO",
    description:
      "Definir um único e-mail oficial (recomendado: dpo@doctor8.org), atualizar landing, app e políticas, e registrar o nome do encarregado no termo de designação.",
    owner: "Direção + Jurídico",
    deadline: "Imediato",
  },
  {
    priority: 2,
    title: "Alinhar exclusão de conta com retenção de prontuário",
    description:
      "Ajustar a API de exclusão (30 dias) para não eliminar prontuários com obrigação de guarda CFM (10 anos) / CFP (5 anos). Implementar bloqueio ou anonimização da conta mantendo registro clínico.",
    owner: "Engenharia + DPO",
    deadline: "30 dias",
  },
  {
    priority: 3,
    title: "Coletar DPAs dos subprocessadores",
    description:
      "Obter e arquivar contratos/DPA assinados ou termos equivalentes com AWS, Daily.co, Google, Stripe e Lacuna.",
    owner: "Jurídico + Compras",
    deadline: "45 dias",
  },
  {
    priority: 4,
    title: "Parecer regulatório ANVISA (SaMD)",
    description:
      "Contratar consultoria para confirmar se a Doctor8 se enquadra como SaMD (RDC 658/2022) ou como sistema de informação em saúde.",
    owner: "Regulatório",
    deadline: "60 dias",
  },
  {
    priority: 5,
    title: "Primeiro treinamento LGPD da equipe",
    description:
      "Realizar capacitação formal e preencher o Registro de Treinamento com lista de participantes e conteúdo.",
    owner: "DPO + RH",
    deadline: "60 dias",
  },
  {
    priority: 6,
    title: "Primeira auditoria interna",
    description:
      "Executar auditoria com base no checklist deste portal, gerar relatório assinado e plano de ação para gaps.",
    owner: "DPO",
    deadline: "90 dias",
  },
  {
    priority: 7,
    title: "Revisar Política de Privacidade",
    description:
      "Atualizar para novos módulos (empresas, humanitário, Angels, meeting rooms, planos) e Res. ANPD 14/2024 e 19/2024.",
    owner: "Jurídico + Produto",
    deadline: "90 dias",
  },
  {
    priority: 8,
    title: "Formalizar contratos com operadores de saúde",
    description:
      "Incluir cláusulas LGPD no onboarding de profissionais e empregadores; exigir aceite eletrônico versionado.",
    owner: "Jurídico + Produto",
    deadline: "90 dias",
  },
  {
    priority: 9,
    title: "Revisar DPIA anualmente",
    description:
      "Reavaliar quando habilitar gravação em nuvem (DAILY_CLOUD_RECORDING), novos usos de IA ou expansão internacional.",
    owner: "DPO + Engenharia",
    deadline: "Recorrente (anual)",
  },
  {
    priority: 10,
    title: "Submeter ROPA à ANPD quando exigido",
    description:
      "Acompanhar regulamentação da Res. ANPD 14/2024 sobre formato e prazo de comunicação do registro de operações.",
    owner: "DPO",
    deadline: "Conforme ANPD",
  },
];

export const complianceHubIntro = {
  title: "Documentação LGPD e Telemedicina",
  subtitle:
    "Portal de conformidade da Doctor8 — INFO8 DESENVOLVIMENTO DE SISTEMAS E SITE LTDA · CNPJ 20.251.527/0001-04",
  description:
    "Repositório central dos documentos de privacidade, segurança e telemedicina exigidos pela LGPD, ANPD, CFM e boas práticas do setor. Clique em cada título para ler o documento completo.",
};
