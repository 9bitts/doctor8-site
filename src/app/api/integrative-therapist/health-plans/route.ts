import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listHealthPlans } from "@/lib/health-plans";
import { requireIntegrativeTherapist } from "@/lib/integrative-therapist-api";

type PlanRuleInput = {
  healthPlanId: string;
  allowedWeekdays?: number[];
  minLeadDays?: number;
};

export async function GET() {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const profile = await db.integrativeTherapistProfile.findUnique({
    where: { id: therapist.id },
    include: {
      healthPlans: {
        select: { healthPlanId: true, allowedWeekdays: true, minLeadDays: true },
      },
    },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const plans = await listHealthPlans();
  const byId = new Map(profile.healthPlans.map((h) => [h.healthPlanId, h]));

  return NextResponse.json({
    plans: plans.map((p) => {
      const row = byId.get(p.id);
      return {
        ...p,
        selected: Boolean(row),
        allowedWeekdays: row?.allowedWeekdays ?? [],
        minLeadDays: row?.minLeadDays ?? 0,
      };
    }),
  });
}

export async function PUT(req: NextRequest) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const body = await req.json();
  const rules: PlanRuleInput[] = Array.isArray(body.plans)
    ? body.plans
    : Array.isArray(body.healthPlanIds)
      ? body.healthPlanIds.map((id: string) => ({ healthPlanId: id }))
      : [];

  const ops = [
    db.integrativeTherapistHealthPlan.deleteMany({
      where: { integrativeTherapistId: therapist.id },
    }),
  ];
  if (rules.length > 0) {
    ops.push(
      db.integrativeTherapistHealthPlan.createMany({
        data: rules.map((r) => ({
          integrativeTherapistId: therapist.id,
          healthPlanId: r.healthPlanId,
          allowedWeekdays: normalizeWeekdays(r.allowedWeekdays),
          minLeadDays: Math.max(0, r.minLeadDays ?? 0),
        })),
        skipDuplicates: true,
      }),
    );
  }
  await db.$transaction(ops);

  return NextResponse.json({ ok: true });
}

function normalizeWeekdays(days: number[] | undefined): number[] {
  if (!days?.length) return [];
  return [...new Set(days.filter((d) => d >= 0 && d <= 6))].sort();
}
