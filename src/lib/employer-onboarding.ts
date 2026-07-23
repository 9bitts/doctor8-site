import type { EmployerCompany, Prisma } from "@prisma/client";

export type OnboardingStep = {
  id: string;
  label: string;
  href: string;
  done: boolean;
};

/** SESMT chronological onboarding — matches médico do trabalho workflow. */
export function buildEmployerOnboardingSteps(input: {
  hasCnae: boolean;
  sectorCount: number;
  functionCount: number;
  gheCount: number;
  riskCount: number;
  pcmsoPercent: number;
  examCount: number;
  aepCompleted: boolean;
  surveyActive: boolean;
  workforceCount: number;
  eapEnabled: boolean;
  actionItemCount: number;
  psychNetworkCount: number;
  exportedDoc: boolean;
}): OnboardingStep[] {
  return [
    {
      id: "company",
      label: "Completar dados da empresa (CNAE)",
      href: "/empresas/configuracoes",
      done: input.hasCnae,
    },
    {
      id: "structure",
      label: "Cadastrar setores, funções e GHE",
      href: "/empresas/estrutura",
      done: input.sectorCount > 0 && input.functionCount > 0 && input.gheCount > 0,
    },
    {
      id: "workforce",
      label: "Vincular colaboradores aos GHE",
      href: "/empresas/colaboradores",
      done: input.workforceCount > 0,
    },
    {
      id: "risks",
      label: "Mapear riscos do PGR por GHE",
      href: "/empresas/nr1",
      done: input.riskCount > 0,
    },
    {
      id: "pcmso",
      label: "Definir matriz PCMSO (médico)",
      href: "/empresas/pcmso",
      done: input.pcmsoPercent >= 50,
    },
    {
      id: "exams",
      label: "Gerar / lançar exames ocupacionais",
      href: "/empresas/exames",
      done: input.examCount > 0,
    },
    {
      id: "aep",
      label: "Ergonomia simplificada (AEP) / AET se necessário",
      href: "/empresas/aep",
      done: input.aepCompleted,
    },
    {
      id: "survey",
      label: "Ativar pesquisa psicossocial organizacional",
      href: "/empresas/pesquisas",
      done: input.surveyActive,
    },
    {
      id: "eap",
      label: "Configurar EAP e rede de psicólogos",
      href: "/empresas/eap",
      done: input.eapEnabled && input.psychNetworkCount > 0,
    },
    {
      id: "action",
      label: "Criar plano de ação",
      href: "/empresas/plano-acao",
      done: input.actionItemCount > 0,
    },
    {
      id: "export",
      label: "Exportar documentação PGR",
      href: "/empresas/documentacao",
      done: input.exportedDoc,
    },
  ];
}

export function onboardingCompletionPercent(steps: OnboardingStep[]): number {
  if (steps.length === 0) return 0;
  return Math.round((steps.filter((s) => s.done).length / steps.length) * 100);
}

export function parseOnboardingDismissed(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  return Boolean((raw as { dismissed?: boolean }).dismissed);
}

export function mergeOnboardingJson(
  existing: unknown,
  patch: Record<string, unknown>,
): Prisma.InputJsonValue {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return { ...base, ...patch } as Prisma.InputJsonValue;
}

export type EmployerPlanLimits = {
  tier: string;
  maxWorkforce: number;
  maxSurveysPerYear: number;
};

const PLAN_LIMITS: Record<string, EmployerPlanLimits> = {
  PILOT: { tier: "PILOT", maxWorkforce: 500, maxSurveysPerYear: 12 },
  STARTER: { tier: "STARTER", maxWorkforce: 100, maxSurveysPerYear: 4 },
  GROWTH: { tier: "GROWTH", maxWorkforce: 500, maxSurveysPerYear: 12 },
  ENTERPRISE: { tier: "ENTERPRISE", maxWorkforce: 50000, maxSurveysPerYear: 100 },
};

export function resolveEmployerPlanLimits(company: Pick<EmployerCompany, "planTier">): EmployerPlanLimits {
  return PLAN_LIMITS[company.planTier] ?? PLAN_LIMITS.PILOT;
}
