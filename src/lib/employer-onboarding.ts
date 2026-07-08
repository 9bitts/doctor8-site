import type { EmployerCompany } from "@prisma/client";

export type OnboardingStep = {
  id: string;
  label: string;
  href: string;
  done: boolean;
};

export function buildEmployerOnboardingSteps(input: {
  riskCount: number;
  aepCompleted: boolean;
  surveyActive: boolean;
  workforceCount: number;
  eapEnabled: boolean;
  actionItemCount: number;
  pcmsoPercent: number;
  exportedDoc: boolean;
}): OnboardingStep[] {
  return [
    { id: "risks", label: "Cadastrar inventário de riscos psicossociais", href: "/empresas/nr1", done: input.riskCount > 0 },
    { id: "survey", label: "Ativar pesquisa organizacional (COPSOQ)", href: "/empresas/pesquisas", done: input.surveyActive },
    { id: "aep", label: "Concluir AEP (NR-17)", href: "/empresas/aep", done: input.aepCompleted },
    { id: "action", label: "Criar plano de ação", href: "/empresas/plano-acao", done: input.actionItemCount > 0 },
    { id: "workforce", label: "Cadastrar colaboradores EAP", href: "/empresas/colaboradores", done: input.workforceCount > 0 },
    { id: "eap", label: "Configurar benefício EAP", href: "/empresas/eap", done: input.eapEnabled },
    { id: "pcmso", label: "Integrar PCMSO (checklist ≥ 50%)", href: "/empresas/pcmso", done: input.pcmsoPercent >= 50 },
    { id: "export", label: "Exportar documentação PGR", href: "/empresas/documentacao", done: input.exportedDoc },
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
): Record<string, unknown> {
  const base = existing && typeof existing === "object" ? { ...(existing as Record<string, unknown>) } : {};
  return { ...base, ...patch };
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
