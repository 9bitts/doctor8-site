import { db } from "@/lib/db";
import { resolveEmployerPlanLimits } from "@/lib/employer-onboarding";

export async function getEmployerPlanLimits(employerCompanyId: string) {
  const company = await db.employerCompany.findUnique({
    where: { id: employerCompanyId },
    select: { planTier: true },
  });
  return resolveEmployerPlanLimits(company ?? { planTier: "PILOT" });
}

export async function assertWorkforceCapacity(employerCompanyId: string): Promise<
  | { ok: true; limits: ReturnType<typeof resolveEmployerPlanLimits>; current: number }
  | { ok: false; code: "WORKFORCE_LIMIT"; limits: ReturnType<typeof resolveEmployerPlanLimits>; current: number }
> {
  const limits = await getEmployerPlanLimits(employerCompanyId);
  const current = await db.employerWorkforceMember.count({
    where: {
      employerCompanyId,
      status: { in: ["ACTIVE", "INVITED"] },
    },
  });
  if (current >= limits.maxWorkforce) {
    return { ok: false, code: "WORKFORCE_LIMIT", limits, current };
  }
  return { ok: true, limits, current };
}

export async function assertSurveyCapacity(employerCompanyId: string): Promise<
  | { ok: true; limits: ReturnType<typeof resolveEmployerPlanLimits>; current: number }
  | { ok: false; code: "SURVEY_LIMIT"; limits: ReturnType<typeof resolveEmployerPlanLimits>; current: number }
> {
  const limits = await getEmployerPlanLimits(employerCompanyId);
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const current = await db.employerSurveyCampaign.count({
    where: { employerCompanyId, createdAt: { gte: yearStart } },
  });
  if (current >= limits.maxSurveysPerYear) {
    return { ok: false, code: "SURVEY_LIMIT", limits, current };
  }
  return { ok: true, limits, current };
}
